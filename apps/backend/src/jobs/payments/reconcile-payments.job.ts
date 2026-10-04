import { prisma, type DbTransaction, transaction } from '../../config/database.js';
import { logger } from '../../core/logger/logger.js';

const db = prisma;

export async function reconcilePaymentsJob(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 60_000);
  const pending = await db.payment.findMany({
    where: { status: 'pending', createdAt: { lte: cutoff }, booking: { status: { in: ['pending_payment', 'expired'] } } },
    select: { id: true, bookingId: true },
    take: 100,
  });
  for (const item of pending) {
    await transaction(async (tx: DbTransaction) => {
      const [locked] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM bookings WHERE id = ${item.bookingId} FOR UPDATE`;
      if (!locked) return;
      const payment = await tx.payment.findUnique({ where: { id: item.id }, include: { booking: true } });
      if (payment?.status !== 'pending' || !['pending_payment', 'expired'].includes(payment.booking.status)) return;
      await tx.payment.update({ where: { id: item.id }, data: { status: 'needs_review', updatedAt: now } });
      await tx.booking.update({ where: { id: item.bookingId }, data: { status: 'needs_review' } });
      await tx.order.updateMany({ where: { bookingId: item.bookingId, status: { in: ['pending_payment', 'expired'] } }, data: { status: 'needs_review' } });
    }, { isolationLevel: 'Serializable' });
  }
  if (pending.length) logger.warn({ count: pending.length }, 'Paiements anciens envoyés en rapprochement manuel');
  return pending.length;
}
