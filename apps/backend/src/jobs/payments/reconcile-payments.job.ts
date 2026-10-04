import { prisma, type DbTransaction, transaction } from '../../config/database.js';
import { logger } from '../../core/logger/logger.js';
import { getGeniusPayPayment } from '../../integrations/geniuspay/geniuspay.client.js';
import { notificationRepository } from '../../modules/notifications/notification.repository.js';
import { notificationService } from '../../modules/notifications/notification.service.js';
import { renderNotification, shortReference } from '../../modules/notifications/notification.templates.js';
import { paymentRepository } from '../../modules/payments/payment.repository.js';

const db = prisma;

/** A payment younger than this still has a normal chance of being confirmed by its webhook. */
const LOOKUP_AFTER_MS = 2 * 60_000;
/** Hold (10 min) plus a generous margin: past this, a payment the gateway cannot settle needs a person. */
const GIVE_UP_AFTER_MS = 45 * 60_000;
const LOOKUP_WINDOW_MS = 48 * 60 * 60_000;
const BATCH = 50;

export interface ReconcileSummary {
  looked: number;
  applied: number;
  stillWaiting: number;
  lookupFailed: number;
  sentToReview: number;
}

/** Asks the gateway about one pending payment and applies the answer. Never throws. */
export async function lookupPayment(paymentId: string, providerReference: string): Promise<'applied' | 'waiting' | 'failed'> {
  try {
    const remote = await getGeniusPayPayment(providerReference);
    if (!remote) return 'waiting';
    const result = await paymentRepository.applyProviderStatus(paymentId, remote);
    if (result.applied) {
      notificationService.dispatch(result.notificationIds);
      return 'applied';
    }
    if (result.reason === 'amount_mismatch' || result.reason === 'reference_mismatch') {
      logger.error({ paymentId, reason: result.reason }, 'Réponse de la passerelle incohérente avec le paiement local');
    }
    return 'waiting';
  } catch (error) {
    logger.warn({ err: error, paymentId }, 'Consultation du paiement impossible; nouvel essai au prochain passage');
    return 'failed';
  }
}

/** Moves a payment that stayed unresolved to manual review and tells the customer. Returns whether it moved. */
export async function sendToReview(paymentId: string, bookingId: string, now = new Date()): Promise<boolean> {
  const notificationIds: string[] = [];
  const moved = await transaction(async (tx: DbTransaction) => {
    const [locked] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
    if (!locked) return false;
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: true } });
    if (payment?.status !== 'pending' || !['pending_payment', 'expired'].includes(payment.booking.status)) return false;
    await tx.payment.update({ where: { id: paymentId }, data: { status: 'needs_review', updatedAt: now } });
    await tx.booking.update({ where: { id: bookingId }, data: { status: 'needs_review' } });
    await tx.order.updateMany({ where: { bookingId, status: { in: ['pending_payment', 'expired'] } }, data: { status: 'needs_review' } });
    const created = await notificationRepository.createIn(tx, {
      userId: payment.booking.userId,
      channel: 'sms',
      template: 'payment_under_review',
      payload: { message: renderNotification('payment_under_review', { reference: shortReference(bookingId) }), bookingId },
    });
    notificationIds.push(created.id);
    return true;
  }, { isolationLevel: 'Serializable' });
  if (moved) notificationService.dispatch(notificationIds);
  return moved;
}

/**
 * Stage 1: for payments still pending after a couple of minutes, ask the gateway what happened (the webhook may have
 * been lost) and apply the answer with the same code the webhook uses.
 * Stage 2: payments that are still unresolved long after the hold expired go to manual review.
 */
export async function reconcilePaymentsJob(now = new Date()): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { looked: 0, applied: 0, stillWaiting: 0, lookupFailed: 0, sentToReview: 0 };

  const candidates = await db.payment.findMany({
    where: {
      status: 'pending',
      providerReference: { not: null },
      createdAt: { lte: new Date(now.getTime() - LOOKUP_AFTER_MS), gte: new Date(now.getTime() - LOOKUP_WINDOW_MS) },
    },
    select: { id: true, providerReference: true },
    orderBy: { updatedAt: 'asc' },
    take: BATCH,
  });

  for (const candidate of candidates) {
    summary.looked += 1;
    const result = await lookupPayment(candidate.id, candidate.providerReference!);
    if (result === 'applied') summary.applied += 1;
    else if (result === 'failed') summary.lookupFailed += 1;
    else summary.stillWaiting += 1;
  }

  const stale = await db.payment.findMany({
    where: { status: 'pending', createdAt: { lte: new Date(now.getTime() - GIVE_UP_AFTER_MS) }, booking: { status: { in: ['pending_payment', 'expired'] } } },
    select: { id: true, bookingId: true },
    take: BATCH,
  });
  for (const item of stale) {
    if (await sendToReview(item.id, item.bookingId, now)) summary.sentToReview += 1;
  }

  if (summary.sentToReview) logger.warn({ count: summary.sentToReview }, 'Paiements non résolus envoyés en revue manuelle');
  return summary;
}
