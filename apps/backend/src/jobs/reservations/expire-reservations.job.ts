import { prisma } from '../../config/database.js';
import { logger } from '../../core/logger/logger.js';

const db = prisma;

export async function expireReservationsJob(now = new Date()): Promise<number> {
  const result = await db.booking.updateMany({
    where: { status: 'pending_payment', holdExpiresAt: { lte: now } },
    data: { status: 'expired' },
  });
  await db.$executeRaw`
    UPDATE orders o SET status = 'expired'
    FROM bookings b
    WHERE o.booking_id = b.id AND o.status = 'pending_payment' AND b.status = 'expired'`;
  if (result.count) logger.info({ expired: result.count }, 'Holds de réservation expirés');
  return result.count;
}
