import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { DomainError, verifyGeniusPaySignature } from '../domain.js';
import { issueTicketsForBooking } from './tickets.js';

const GENIUSPAY_DEFAULT_BASE_URL = 'https://pay.genius.ci/api/v1/merchant';

export interface GeniusPayPaymentResponse {
  success?: boolean;
  data?: {
    id?: string | number;
    reference?: string;
    status?: string;
    checkout_url?: string;
    payment_url?: string;
    fees?: number;
    net_amount?: number;
    [key: string]: unknown;
  };
  error?: { message?: string; code?: string };
}

function getGeniusPayConfig() {
  const apiKey = process.env.GENIUSPAY_API_KEY;
  const apiSecret = process.env.GENIUSPAY_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new DomainError('La passerelle GeniusPay n’est pas configurée sur le serveur.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  return {
    apiKey,
    apiSecret,
    baseUrl: (process.env.GENIUSPAY_API_BASE_URL || GENIUSPAY_DEFAULT_BASE_URL).replace(/\/$/, ''),
  };
}

export async function startGeniusPayPayment(userId: string, bookingId: string, paymentMethod?: unknown) {
  if (typeof bookingId !== 'string' || !bookingId.trim()) {
    throw new DomainError('Réservation invalide.', 400, 'BOOKING_REQUIRED');
  }
  const method = typeof paymentMethod === 'string' && paymentMethod.length <= 40
    ? paymentMethod
    : undefined;
  const config = getGeniusPayConfig();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const bookingResult = await client.query<{
      id: string;
      user_id: string;
      product_type: string;
      status: string;
      amount_xof: number;
      hold_expires_at: Date;
      full_name: string;
      phone: string;
      event_title: string | null;
      carrier: string | null;
    }>(
      `SELECT b.id, b.user_id, b.product_type, b.status, b.amount_xof, b.hold_expires_at,
              u.full_name, u.phone, e.title AS event_title, bt.carrier
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       LEFT JOIN events e ON e.id = b.event_id
       LEFT JOIN bus_trips bt ON bt.id = b.bus_trip_id
       WHERE b.id = $1 FOR UPDATE OF b`,
      [bookingId],
    );
    const booking = bookingResult.rows[0];
    if (!booking || booking.user_id !== userId) {
      throw new DomainError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');
    }
    if (booking.status !== 'pending_payment' || new Date(booking.hold_expires_at).getTime() <= Date.now()) {
      throw new DomainError('Le délai de réservation a expiré. Veuillez recommencer.', 409, 'BOOKING_EXPIRED');
    }

    const previous = await client.query<{
      provider_reference: string | null;
      checkout_url: string | null;
      status: string;
      idempotency_key: string;
    }>('SELECT provider_reference, checkout_url, status, idempotency_key FROM payments WHERE booking_id = $1 FOR UPDATE', [bookingId]);
    if (previous.rows[0]?.status === 'completed') {
      throw new DomainError('Cette réservation est déjà payée.', 409, 'BOOKING_ALREADY_PAID');
    }
    if (previous.rows[0]?.checkout_url && previous.rows[0]?.status === 'pending') {
      await client.query('COMMIT');
      return {
        bookingId,
        checkoutUrl: previous.rows[0].checkout_url,
        providerReference: previous.rows[0].provider_reference,
        status: 'pending',
      };
    }

    const paymentId = randomUUID();
    const idempotencyKey = previous.rows[0]?.idempotency_key || randomUUID();
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const title = booking.event_title || booking.carrier || 'TicketHub CI';
    const providerMethod: Record<string, string> = {
      wave: 'wave',
      orange: 'orange_money',
      mtn: 'mtn_money',
      cb: 'card',
    };
    const body = {
      ...(method && providerMethod[method] ? { payment_method: providerMethod[method] } : {}),
      amount: Number(booking.amount_xof),
      currency: 'XOF',
      description: `${title} — réservation ${booking.id}`.slice(0, 500),
      customer: {
        name: booking.full_name,
        phone: booking.phone,
        country: 'CI',
      },
      success_url: `${appUrl}/?payment=return&booking=${encodeURIComponent(booking.id)}`,
      error_url: `${appUrl}/?payment=failed&booking=${encodeURIComponent(booking.id)}`,
      metadata: {
        booking_id: booking.id,
        user_id: userId,
        product_type: booking.product_type,
        idempotency_key: idempotencyKey,
        requested_method: method || 'checkout',
      },
    };

    const response = await fetch(`${config.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const providerResult = await response.json().catch(() => ({})) as GeniusPayPaymentResponse;
    const paymentData = providerResult.data;
    const checkoutUrl = paymentData?.checkout_url || paymentData?.payment_url;
    if (!response.ok || !checkoutUrl || !paymentData?.reference) {
      throw new DomainError(
        providerResult.error?.message || 'Impossible de démarrer le paiement. Réessayez ou contactez le support.',
        502,
        'PAYMENT_PROVIDER_ERROR',
      );
    }

    await client.query(
      `INSERT INTO payments (
         id, booking_id, provider_reference, idempotency_key, checkout_url, payment_method,
         status, amount_xof, provider_response, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8::jsonb,NOW())
       ON CONFLICT (booking_id) DO UPDATE SET
         provider_reference = EXCLUDED.provider_reference,
         checkout_url = EXCLUDED.checkout_url,
         payment_method = EXCLUDED.payment_method,
         status = 'pending',
         amount_xof = EXCLUDED.amount_xof,
         provider_response = EXCLUDED.provider_response,
         updated_at = NOW()`,
      [
        paymentId,
        booking.id,
        paymentData.reference,
        idempotencyKey,
        checkoutUrl,
        method || 'checkout',
        Number(booking.amount_xof),
        JSON.stringify(providerResult),
      ],
    );
    await client.query('COMMIT');
    return {
      bookingId,
      checkoutUrl,
      providerReference: paymentData.reference,
      status: 'pending',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof DomainError) throw error;
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new DomainError('La passerelle ne répond pas pour le moment. Réessayez plus tard.', 504, 'PAYMENT_TIMEOUT');
    }
    throw error;
  } finally {
    client.release();
  }
}

interface GeniusPayWebhook {
  id?: string;
  event?: string;
  timestamp?: number;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
}

export async function processGeniusPayWebhook(input: {
  signature: string;
  timestamp: string;
  deliveryId?: string;
  rawBody: Buffer;
}) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new DomainError('Le secret webhook GeniusPay n’est pas configuré.', 503, 'WEBHOOK_NOT_CONFIGURED');
  }
  const valid = verifyGeniusPaySignature({
    secret,
    timestamp: input.timestamp,
    signature: input.signature,
    rawBody: input.rawBody,
  });
  if (!valid) throw new DomainError('Signature webhook invalide ou expirée.', 401, 'INVALID_WEBHOOK_SIGNATURE');

  let payload: GeniusPayWebhook;
  try {
    payload = JSON.parse(input.rawBody.toString('utf8')) as GeniusPayWebhook;
  } catch {
    throw new DomainError('Corps webhook JSON invalide.', 400, 'INVALID_WEBHOOK_BODY');
  }
  const eventId = input.deliveryId || payload.id;
  const eventType = payload.event;
  const reference = payload.data?.reference;
  const bookingId = payload.data?.metadata?.booking_id;
  if (typeof eventId !== 'string' || !eventId || typeof eventType !== 'string' || !eventType) {
    throw new DomainError('Identifiants webhook manquants.', 400, 'INVALID_WEBHOOK_BODY');
  }
  if (typeof reference !== 'string' || typeof bookingId !== 'string') {
    throw new DomainError('Référence de paiement ou réservation manquante.', 400, 'INVALID_WEBHOOK_BODY');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const delivery = await client.query(
      `INSERT INTO webhook_deliveries (delivery_id, event_type)
       VALUES ($1, $2) ON CONFLICT (delivery_id) DO NOTHING RETURNING delivery_id`,
      [eventId, eventType],
    );
    if (delivery.rowCount === 0) {
      await client.query('COMMIT');
      return { accepted: true, duplicate: true };
    }

    const paymentResult = await client.query<{
      id: string;
      booking_id: string;
      provider_reference: string;
      amount_xof: number;
      payment_status: string;
      booking_status: string;
      hold_expires_at: Date;
    }>(
      `SELECT p.id, p.booking_id, p.provider_reference, p.amount_xof, p.status AS payment_status,
              b.status AS booking_status, b.hold_expires_at
       FROM payments p JOIN bookings b ON b.id = p.booking_id
       WHERE p.booking_id = $1
       FOR UPDATE OF p, b`,
      [bookingId],
    );
    const payment = paymentResult.rows[0];
    const data = payload.data;
    if (!payment || payment.provider_reference !== reference) {
      throw new DomainError('Le paiement ne correspond à aucune réservation.', 404, 'PAYMENT_NOT_FOUND');
    }
    if (Number(data?.amount) !== Number(payment.amount_xof) || data?.currency !== 'XOF') {
      throw new DomainError('Montant ou devise webhook inattendu.', 409, 'PAYMENT_AMOUNT_MISMATCH');
    }

    const isSuccess = eventType === 'payment.success' && data?.status === 'completed';
    const isFailure = ['payment.failed', 'payment.cancelled', 'payment.expired'].includes(eventType);
    if (isSuccess && payment.payment_status !== 'completed') {
      await client.query(
        `UPDATE payments SET status = 'completed', updated_at = NOW()
         WHERE id = $1`,
        [payment.id],
      );
      if (payment.booking_status === 'pending_payment' && new Date(payment.hold_expires_at).getTime() > Date.now()) {
        await client.query("UPDATE bookings SET status = 'paid' WHERE id = $1", [bookingId]);
        await issueTicketsForBooking(client, bookingId);
      } else {
        // Payment arrived after the seat/category hold expired. Keep an explicit state for reconciliation/refund.
        await client.query("UPDATE bookings SET status = 'needs_review' WHERE id = $1", [bookingId]);
      }
    } else if (isFailure && payment.payment_status === 'pending') {
      const status = eventType === 'payment.expired' ? 'expired' : 'failed';
      await client.query('UPDATE payments SET status = $2, updated_at = NOW() WHERE id = $1', [payment.id, status]);
      if (payment.booking_status === 'pending_payment') {
        await client.query('UPDATE bookings SET status = $2 WHERE id = $1', [bookingId, status]);
      }
    }

    await client.query('COMMIT');
    return { accepted: true, duplicate: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
