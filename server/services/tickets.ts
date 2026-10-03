import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DomainError, makeTicketCode, signTicket, verifyTicket } from '../domain.js';
import { pool } from '../db.js';
import type { AuthUser } from '../types.js';

function paymentMethodLabel(method: string | null | undefined): string {
  const labels: Record<string, string> = {
    wave: 'Wave',
    orange: 'Orange Money',
    mtn: 'MTN MoMo',
    moov: 'Moov Money',
    cb: 'Carte bancaire',
    checkout: 'GeniusPay',
  };
  return method ? labels[method] || 'GeniusPay' : 'GeniusPay';
}

function signingSecret(): string {
  const secret = process.env.TICKET_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('TICKET_SIGNING_SECRET doit contenir au moins 32 caractères.');
  }
  return secret;
}

export async function issueTicketsForBooking(client: PoolClient, bookingId: string): Promise<void> {
  const { rows } = await client.query<{
    id: string;
    quantity: number;
    product_type: 'transport' | 'event';
    seats: number[];
  }>('SELECT id, quantity, product_type, seats FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
  const booking = rows[0];
  if (!booking) throw new DomainError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');

  for (let ordinal = 0; ordinal < booking.quantity; ordinal += 1) {
    await client.query(
      `INSERT INTO tickets (id, booking_id, ordinal, code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (booking_id, ordinal) DO NOTHING`,
      [randomUUID(), bookingId, ordinal, makeTicketCode()],
    );
  }
}

export async function listUserTickets(user: AuthUser) {
  const { rows } = await pool.query(
    `SELECT t.id AS ticket_id, t.booking_id, t.ordinal, t.code, t.status, t.used_at,
            b.product_type, b.amount_xof, b.seats, b.quantity, b.created_at,
            u.full_name AS passenger_name, u.phone AS passenger_phone,
            bt.carrier, bt.depart_city, bt.depart_station, bt.arrival_city, bt.arrival_station, bt.depart_at,
            e.title AS event_title, e.venue, e.city, e.starts_at, c.name AS category_name,
            p.payment_method
     FROM tickets t
     JOIN bookings b ON b.id = t.booking_id
     JOIN users u ON u.id = b.user_id
     LEFT JOIN bus_trips bt ON bt.id = b.bus_trip_id
     LEFT JOIN events e ON e.id = b.event_id
     LEFT JOIN event_ticket_categories c ON c.id = b.ticket_category_id
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE b.user_id = $1 AND b.status = 'paid'
     ORDER BY b.created_at DESC, t.ordinal ASC`,
    [user.id],
  );

  return rows.map((row) => {
    const validUntil = row.product_type === 'transport'
      ? new Date(new Date(row.depart_at).getTime() + 24 * 60 * 60 * 1000)
      : new Date(new Date(row.starts_at).getTime() + 12 * 60 * 60 * 1000);
    const exp = Math.floor(validUntil.getTime() / 1000);
    const qrPayload = signTicket(
      { v: 1, ticketId: row.ticket_id, bookingId: row.booking_id, exp },
      signingSecret(),
    );
    const seats = (row.seats ?? []) as number[];
    return {
      id: row.ticket_id,
      ticketCode: row.code,
      commandRef: row.booking_id,
      productType: row.product_type,
      status: row.status,
      usedAt: row.used_at,
      passengerName: row.passenger_name,
      passengerPhone: row.passenger_phone,
      carrier: row.carrier,
      departCity: row.depart_city,
      departStation: row.depart_station,
      arrivalCity: row.arrival_city,
      arrivalStation: row.arrival_station,
      departureDate: row.product_type === 'transport' ? new Date(row.depart_at).toISOString() : new Date(row.starts_at).toISOString(),
      departureTime: row.product_type === 'transport'
        ? new Date(row.depart_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : new Date(row.starts_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      eventTitle: row.event_title,
      venue: row.venue,
      city: row.city,
      category: row.category_name,
      seats: row.product_type === 'transport' && seats[row.ordinal] !== undefined ? [seats[row.ordinal]] : [],
      quantity: row.quantity,
      price: Number(row.amount_xof) / Number(row.quantity),
      paymentMethod: paymentMethodLabel(row.payment_method),
      qrPayload,
      issuedAt: new Date(row.created_at).toISOString(),
    };
  });
}

export async function consumeTicket(input: { token?: unknown; ticketCode?: unknown }) {
  let ticketId: string | undefined;
  let bookingId: string | undefined;
  let tokenClaims: ReturnType<typeof verifyTicket> | undefined;

  if (typeof input.token === 'string' && input.token.length > 0) {
    tokenClaims = verifyTicket(input.token, signingSecret());
    ticketId = tokenClaims.ticketId;
    bookingId = tokenClaims.bookingId;
  } else if (typeof input.ticketCode === 'string' && input.ticketCode.trim()) {
    const code = input.ticketCode.trim().toUpperCase();
    const match = await pool.query<{ id: string; booking_id: string }>(
      'SELECT id, booking_id FROM tickets WHERE code = $1',
      [code],
    );
    ticketId = match.rows[0]?.id;
    bookingId = match.rows[0]?.booking_id;
  } else {
    throw new DomainError('Scannez un QR valide ou saisissez son code.', 400, 'TICKET_REQUIRED');
  }

  if (!ticketId || !bookingId) {
    throw new DomainError('Billet introuvable.', 404, 'TICKET_NOT_FOUND');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT t.id, t.code, t.status, t.used_at, t.booking_id,
              b.product_type, b.status AS booking_status, b.amount_xof, b.seats, b.quantity, t.ordinal,
              u.full_name, u.phone,
              bt.carrier, bt.depart_city, bt.depart_station, bt.arrival_city, bt.arrival_station, bt.depart_at,
              e.title AS event_title, e.venue, e.city, e.starts_at, c.name AS category_name,
              p.payment_method
       FROM tickets t
       JOIN bookings b ON b.id = t.booking_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN bus_trips bt ON bt.id = b.bus_trip_id
       LEFT JOIN events e ON e.id = b.event_id
       LEFT JOIN event_ticket_categories c ON c.id = b.ticket_category_id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE t.id = $1 AND t.booking_id = $2
       FOR UPDATE OF t, b`,
      [ticketId, bookingId],
    );
    const row = rows[0];
    if (!row || row.booking_status !== 'paid') {
      throw new DomainError('Réservation non réglée ou billet introuvable.', 409, 'BOOKING_NOT_PAID');
    }
    if (tokenClaims && (tokenClaims.ticketId !== row.id || tokenClaims.bookingId !== row.booking_id)) {
      throw new DomainError('Le jeton ne correspond pas au billet.', 401, 'TICKET_BINDING_INVALID');
    }
    const validUntil = row.product_type === 'transport'
      ? new Date(new Date(row.depart_at).getTime() + 24 * 60 * 60 * 1000)
      : new Date(new Date(row.starts_at).getTime() + 12 * 60 * 60 * 1000);
    if (Date.now() > validUntil.getTime()) {
      throw new DomainError('Ce billet a expiré.', 410, 'TICKET_EXPIRED');
    }
    if (row.status === 'used') {
      throw new DomainError('Ce billet a déjà été utilisé.', 409, 'TICKET_ALREADY_USED');
    }
    if (row.status !== 'active') {
      throw new DomainError('Ce billet n’est pas actif.', 409, 'TICKET_INACTIVE');
    }

    const updated = await client.query(
      `UPDATE tickets SET status = 'used', used_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING used_at`,
      [ticketId],
    );
    if (updated.rowCount !== 1) {
      throw new DomainError('Ce billet a déjà été utilisé.', 409, 'TICKET_ALREADY_USED');
    }
    await client.query('COMMIT');

    return {
      ticketId: row.id,
      ticketCode: row.code,
      status: 'used',
      usedAt: updated.rows[0].used_at,
      productType: row.product_type,
      passengerName: row.full_name,
      passengerPhone: row.phone,
      carrier: row.carrier,
      departCity: row.depart_city,
      departStation: row.depart_station,
      arrivalCity: row.arrival_city,
      arrivalStation: row.arrival_station,
      departureAt: row.depart_at,
      eventTitle: row.event_title,
      venue: row.venue,
      city: row.city,
      startsAt: row.starts_at,
      category: row.category_name,
      seats: row.product_type === 'transport' && row.seats?.[row.ordinal] !== undefined ? [row.seats[row.ordinal]] : [],
      price: Number(row.amount_xof) / Number(row.quantity),
      paymentMethod: paymentMethodLabel(row.payment_method),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
