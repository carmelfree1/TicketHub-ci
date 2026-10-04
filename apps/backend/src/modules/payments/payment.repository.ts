import type { GeniusPayAdapterInput } from '../../integrations/geniuspay/geniuspay.adapter.js';
import { randomUUID } from 'node:crypto';
import { prisma, type DbTransaction, transaction } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { GeniusPayPayment, GeniusPayPaymentStatus, GeniusPayWebhookPayload } from '../../integrations/geniuspay/geniuspay.types.js';
import { applyPaymentOutcome, outcomeForStatus, outcomeForWebhook } from './payment-outcome.js';
import type { PaymentMethodId } from './payment.types.js';

const db = prisma;
const PAYMENT_START_LEASE_MS = 30_000;

export const paymentRepository = {
  async start(userId: string, bookingId: string, paymentMethod: PaymentMethodId, createProviderPayment: (input: Omit<GeniusPayAdapterInput, 'appUrl'>) => Promise<GeniusPayPayment>) {
    const prepared = await transaction(async (tx: DbTransaction) => {
      const [locked] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      if (!locked) throw new AppError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { user: true, event: true, busTrip: true, payment: true },
      });
      if (!booking || booking.userId !== userId) throw new AppError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');
      if (booking.status !== 'pending_payment' || booking.holdExpiresAt.getTime() <= Date.now()) {
        throw new AppError('Le délai de réservation a expiré. Recommencez la sélection.', 409, 'BOOKING_EXPIRED');
      }
      if (booking.payment?.status === 'completed') throw new AppError('Cette réservation est déjà payée.', 409, 'BOOKING_ALREADY_PAID');
      if (booking.payment?.checkoutUrl && booking.payment.status === 'pending') {
        return {
          shouldCreate: false as const,
          payment: {
            bookingId,
            checkoutUrl: booking.payment.checkoutUrl,
            providerReference: booking.payment.providerReference,
            status: 'pending',
          },
        };
      }
      if (booking.payment && booking.payment.status !== 'pending') {
        throw new AppError('Ce paiement n’est plus en attente.', 409, 'PAYMENT_NOT_PENDING');
      }

      const now = new Date();
      let idempotencyKey = booking.payment?.idempotencyKey;
      if (booking.payment) {
        if (booking.payment.updatedAt.getTime() > now.getTime() - PAYMENT_START_LEASE_MS) {
          throw new AppError('La création du checkout est déjà en cours. Réessayez dans quelques secondes.', 409, 'PAYMENT_INITIALIZING');
        }
        await tx.payment.update({
          where: { bookingId },
          data: { paymentMethod, amountXof: booking.amountXof, updatedAt: now },
        });
      } else {
        idempotencyKey = randomUUID();
        await tx.payment.create({
          data: {
            id: randomUUID(), bookingId, idempotencyKey, paymentMethod,
            status: 'pending', amountXof: booking.amountXof,
            providerResponse: { checkoutCreation: 'started' },
          },
        });
      }

      const description = booking.event?.title || booking.busTrip?.carrier || 'TicketHub CI';
      return {
        shouldCreate: true as const,
        idempotencyKey: idempotencyKey!,
        input: {
          amount: booking.amountXof,
          description,
          customer: { name: booking.user.fullName, phone: booking.user.phone },
          bookingId,
          userId,
          productType: booking.productType as 'transport' | 'event',
          idempotencyKey: idempotencyKey!,
          paymentMethod,
        },
      };
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 10_000 });

    if (!prepared.shouldCreate) return prepared.payment;
    try {
      const providerPayment = await createProviderPayment(prepared.input);
      const updated = await db.payment.updateMany({
        where: { bookingId, idempotencyKey: prepared.idempotencyKey, status: 'pending' },
        data: {
          providerReference: providerPayment.reference,
          checkoutUrl: providerPayment.checkoutUrl,
          providerResponse: { status: providerPayment.status ?? 'pending' },
          updatedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new AppError('Le checkout n’a pas pu être associé à la réservation.', 409, 'PAYMENT_STATE_CHANGED');
      const created = await db.payment.findUniqueOrThrow({ where: { bookingId }, select: { id: true, amountXof: true } });
      await db.paymentTransaction.create({
        data: {
          id: randomUUID(),
          paymentId: created.id,
          kind: 'checkout',
          eventType: 'checkout.created',
          amountXof: created.amountXof,
          currency: 'XOF',
          status: 'pending',
          payload: { reference: providerPayment.reference, status: providerPayment.status ?? 'pending' },
        },
      }).catch((error: unknown) => logger.warn({ err: error, bookingId }, 'Journal de paiement non écrit'));
      return { bookingId, checkoutUrl: providerPayment.checkoutUrl, providerReference: providerPayment.reference, status: 'pending' };
    } catch (error) {
      // Retain the idempotency key so the next attempt can safely retry the provider request.
      await db.payment.updateMany({
        where: { bookingId, idempotencyKey: prepared.idempotencyKey, status: 'pending', checkoutUrl: null },
        data: { updatedAt: new Date(Date.now() - PAYMENT_START_LEASE_MS - 1) },
      }).catch(() => undefined);
      throw error;
    }
  },

  async processWebhook(deliveryId: string, eventType: string, payload: GeniusPayWebhookPayload) {
    return transaction(async (tx: DbTransaction) => {
      const delivery = await tx.webhookDelivery.createMany({
        data: [{ deliveryId, eventType }],
        skipDuplicates: true,
      });
      if (delivery.count === 0) return { accepted: true, duplicate: true, notificationIds: [] as string[], partialRefund: false };
      const data = payload.data!;
      const bookingId = String(data.metadata?.booking_id || '');
      const [locked] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const payment = locked ? await tx.payment.findUnique({ where: { bookingId }, include: { booking: true } }) : null;
      if (!payment || payment.providerReference !== data.reference) throw new AppError('Le paiement ne correspond à aucune réservation.', 404, 'PAYMENT_NOT_FOUND');

      // A refund event may carry the refunded amount, which can legitimately be lower than the payment.
      const amount = Number(data.amount);
      const isRefund = eventType === 'payment.refunded';
      const amountMatches = isRefund ? Number.isFinite(amount) && amount > 0 && amount <= payment.amountXof : amount === payment.amountXof;
      if (!amountMatches || data.currency !== 'XOF') {
        throw new AppError('Montant ou devise webhook inattendu.', 409, 'PAYMENT_AMOUNT_MISMATCH');
      }

      // The exact provider payload is kept next to the decision it caused, for reconciliation and disputes.
      await tx.paymentTransaction.create({
        data: {
          id: randomUUID(),
          paymentId: payment.id,
          kind: 'webhook',
          providerEventId: deliveryId,
          eventType,
          amountXof: Number.isFinite(amount) ? amount : null,
          currency: data.currency ?? null,
          status: data.status ?? null,
          payload: payload as unknown as Prisma.InputJsonObject,
        },
      });

      const partialRefund = isRefund && amount < payment.amountXof;
      const outcome = partialRefund ? null : outcomeForWebhook(eventType, data.status);
      const notificationIds = outcome ? await applyPaymentOutcome(tx, payment, outcome) : [];
      return { accepted: true, duplicate: false, notificationIds, partialRefund };
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 20_000 });
  },

  /**
   * Applies what a status lookup (GET /payments/{reference}) revealed for a payment still marked pending, for the
   * case where the webhook never arrived. Same checks and same outcome code as the webhook path.
   */
  async applyProviderStatus(paymentId: string, remote: GeniusPayPaymentStatus) {
    const none = (reason: string) => ({ applied: false, notificationIds: [] as string[], reason });
    return transaction(async (tx: DbTransaction) => {
      const found = await tx.payment.findUnique({ where: { id: paymentId }, select: { bookingId: true } });
      if (!found) return none('unknown_payment');
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${found.bookingId} FOR UPDATE`;
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
      if (!payment || payment.status !== 'pending') return none('not_pending');
      if (payment.providerReference !== remote.reference) return none('reference_mismatch');
      const outcome = outcomeForStatus(remote.status);
      if (!outcome) return none('still_waiting');
      if (outcome === 'success' && (remote.amount !== payment.amountXof || remote.currency !== 'XOF')) return none('amount_mismatch');
      await tx.paymentTransaction.createMany({
        data: [{
          id: randomUUID(),
          paymentId: payment.id,
          kind: 'reconciliation',
          providerEventId: `reconcile:${remote.reference}:${remote.status}`,
          eventType: `lookup.${remote.status}`,
          amountXof: remote.amount,
          currency: remote.currency,
          status: remote.status,
          payload: remote as unknown as Prisma.InputJsonObject,
        }],
        skipDuplicates: true,
      });
      return { applied: true, notificationIds: await applyPaymentOutcome(tx, payment, outcome), reason: outcome };
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 20_000 });
  },
};
