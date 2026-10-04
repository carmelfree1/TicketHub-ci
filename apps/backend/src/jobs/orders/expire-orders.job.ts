import { prisma } from '../../config/database.js';

const db = prisma;

export async function expireOrdersJob(now = new Date()): Promise<number> {
  return db.$executeRaw`
    UPDATE orders o SET status = 'expired'
    FROM bookings b
    WHERE o.booking_id = b.id AND o.status = 'pending_payment'
      AND b.status = 'pending_payment' AND b.hold_expires_at <= ${now}`;
}
