import { randomUUID } from 'node:crypto';
import type { DbTransaction } from '../../config/database.js';
import type { Booking, Payment } from '../../generated/prisma/client.js';
import { notificationRepository } from '../notifications/notification.repository.js';
import { renderNotification, shortReference, type NotificationTemplate } from '../notifications/notification.templates.js';
import { orderRepository } from '../orders/order.repository.js';
import { issueTicketsForBooking } from '../tickets/ticket.service.js';

/** What the payment gateway told us, whichever way we learned it (webhook or a status lookup). */
export type PaymentOutcome = 'success' | 'failed' | 'expired' | 'cancelled' | 'refunded';

export type PaymentWithBooking = Payment & { booking: Booking };

async function notify(tx: DbTransaction, ids: string[], payment: PaymentWithBooking, template: NotificationTemplate): Promise<void> {
  const message = renderNotification(template, {
    reference: shortReference(payment.bookingId),
    quantity: payment.booking.quantity,
    amountXof: payment.amountXof,
  });
  const created = await notificationRepository.createIn(tx, {
    userId: payment.booking.userId,
    channel: 'sms',
    template,
    payload: { message, bookingId: payment.bookingId },
  });
  ids.push(created.id);
}

/**
 * Applies a gateway outcome to a payment inside the caller's transaction. The caller has already locked the booking
 * row and verified the reference, amount and currency. Every branch is idempotent: replaying an outcome that was
 * already applied changes nothing, which is what makes webhooks and status lookups safe to combine.
 * Returns the ids of notifications written in the same transaction, to be delivered after it commits.
 */
export async function applyPaymentOutcome(tx: DbTransaction, payment: PaymentWithBooking, outcome: PaymentOutcome): Promise<string[]> {
  const notificationIds: string[] = [];
  const { bookingId } = payment;

  if (outcome === 'success') {
    if (payment.status === 'completed' || payment.status === 'refunded') return notificationIds;
    const holdValid = payment.booking.status === 'pending_payment' && payment.booking.holdExpiresAt.getTime() > Date.now();
    if (holdValid) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'completed', updatedAt: new Date() } });
      const booking = await tx.booking.update({ where: { id: bookingId }, data: { status: 'paid' } });
      await orderRepository.createFromBooking(tx, booking);
      await issueTicketsForBooking(tx, bookingId);
      await notify(tx, notificationIds, payment, 'payment_confirmed');
    } else {
      // Money arrived after the seats were released: never issue a ticket for seats someone else may now hold.
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'needs_review', updatedAt: new Date() } });
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'needs_review' } });
      await tx.order.updateMany({ where: { bookingId, status: { in: ['pending_payment', 'expired'] } }, data: { status: 'needs_review' } });
      await notify(tx, notificationIds, payment, 'payment_under_review');
    }
    return notificationIds;
  }

  if (outcome === 'refunded') {
    if (payment.status !== 'completed') return notificationIds;
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'refunded', updatedAt: new Date() } });
    const order = await tx.order.findUnique({ where: { bookingId } });
    if (order) {
      await tx.order.update({ where: { id: order.id }, data: { status: 'refunded' } });
      const now = new Date();
      await tx.refund.upsert({
        where: { orderId: order.id },
        create: { id: randomUUID(), orderId: order.id, userId: payment.booking.userId, reason: 'Remboursement signalé par la passerelle de paiement.', status: 'completed', updatedAt: now },
        update: { status: 'completed', updatedAt: now },
      });
    }
    // A refunded ticket must stop opening doors. Tickets already used stay as they are, as proof of entry.
    await tx.ticket.updateMany({ where: { bookingId, status: 'active' }, data: { status: 'cancelled' } });
    await notify(tx, notificationIds, payment, 'refund_completed');
    return notificationIds;
  }

  // failed, expired or cancelled: only a payment that is still waiting can fail.
  if (payment.status !== 'pending') return notificationIds;
  const status = outcome === 'expired' ? 'expired' : 'failed';
  await tx.payment.update({ where: { id: payment.id }, data: { status, updatedAt: new Date() } });
  if (payment.booking.status === 'pending_payment') {
    await tx.booking.update({ where: { id: bookingId }, data: { status } });
    await tx.order.updateMany({ where: { bookingId, status: 'pending_payment' }, data: { status } });
    await notify(tx, notificationIds, payment, 'payment_failed');
  }
  return notificationIds;
}

export function outcomeForWebhook(eventType: string, status: string | undefined): PaymentOutcome | null {
  if (eventType === 'payment.success') return status === 'completed' ? 'success' : null;
  if (eventType === 'payment.failed') return 'failed';
  if (eventType === 'payment.cancelled') return 'cancelled';
  if (eventType === 'payment.expired') return 'expired';
  if (eventType === 'payment.refunded') return 'refunded';
  return null;
}

/** Maps the documented status values of GET /payments/{reference}. pending and processing mean "still waiting". */
export function outcomeForStatus(status: string): PaymentOutcome | null {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'expired') return 'expired';
  return null;
}
