import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';
import type { GeniusPayPayment, GeniusPayWebhookPayload } from '../../integrations/geniuspay/geniuspay.types.js';
import { issueTicketsForBooking } from '../tickets/ticket.service.js';
import { orderRepository } from '../orders/order.repository.js';
import type { PaymentMethodId } from './payment.types.js';

const db = prisma as any;
const PAYMENT_START_LEASE_MS = 30_000;

export const paymentRepository = {
  async start(userId: string, bookingId: string, paymentMethod: PaymentMethodId, createProviderPayment: (input: any) => Promise<GeniusPayPayment>) {
    const prepared = await db.$transaction(async (tx: any) => {
      const [locked] = await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
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
          shouldCreate: false,
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
        shouldCreate: true,
        idempotencyKey: idempotencyKey!,
        input: {
          amount: booking.amountXof,
          description,
          customer: { name: booking.user.fullName, phone: booking.user.phone },
          bookingId,
          userId,
          productType: booking.productType,
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
    return db.$transaction(async (tx: any) => {
      const delivery = await tx.webhookDelivery.createMany({
        data: [{ deliveryId, eventType }],
        skipDuplicates: true,
      });
      if (delivery.count === 0) return { accepted: true, duplicate: true };
      const data = payload.data!;
      const bookingId = String(data.metadata?.booking_id || '');
      const [locked] = await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const payment = locked ? await tx.payment.findUnique({ where: { bookingId }, include: { booking: true } }) : null;
      if (!payment || payment.providerReference !== data.reference) throw new AppError('Le paiement ne correspond à aucune réservation.', 404, 'PAYMENT_NOT_FOUND');
      if (Number(data.amount) !== payment.amountXof || data.currency !== 'XOF') {
        throw new AppError('Montant ou devise webhook inattendu.', 409, 'PAYMENT_AMOUNT_MISMATCH');
      }

      const success = eventType === 'payment.success' && data.status === 'completed';
      const failure = ['payment.failed', 'payment.cancelled', 'payment.expired'].includes(eventType);
      if (success && payment.status !== 'completed') {
        const holdValid = payment.booking.status === 'pending_payment' && payment.booking.holdExpiresAt.getTime() > Date.now();
        if (holdValid) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'completed', updatedAt: new Date() } });
          const booking = await tx.booking.update({ where: { id: bookingId }, data: { status: 'paid' } });
          await orderRepository.createFromBooking(tx, booking);
          await issueTicketsForBooking(tx, bookingId);
        } else {
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'needs_review', updatedAt: new Date() } });
          await tx.booking.update({ where: { id: bookingId }, data: { status: 'needs_review' } });
          await tx.order.updateMany({ where: { bookingId, status: 'pending_payment' }, data: { status: 'needs_review' } });
        }
      } else if (failure && payment.status === 'pending') {
        const status = eventType === 'payment.expired' ? 'expired' : 'failed';
        await tx.payment.update({ where: { id: payment.id }, data: { status, updatedAt: new Date() } });
        if (payment.booking.status === 'pending_payment') {
          await tx.booking.update({ where: { id: bookingId }, data: { status } });
          await tx.order.updateMany({ where: { bookingId, status: 'pending_payment' }, data: { status } });
        }
      }
      return { accepted: true, duplicate: false };
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 20_000 });
  },
};
