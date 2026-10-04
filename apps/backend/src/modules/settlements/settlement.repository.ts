import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

const db = prisma;

export const settlementRepository = {
  async generate(periodStart: Date, periodEnd: Date) {
    const groups = await db.$queryRaw`
      SELECT bt.carrier_code AS "providerCode", SUM(b.amount_xof)::bigint AS "grossXof"
      FROM bookings b
      JOIN bus_trips bt ON bt.id = b.bus_trip_id
      JOIN payments p ON p.booking_id = b.id
      WHERE b.status = 'paid' AND p.status = 'completed'
        AND b.created_at >= ${periodStart} AND b.created_at < ${periodEnd}
      GROUP BY bt.carrier_code` as Array<{ providerCode: string; grossXof: bigint | number }>;
    const results = [];
    for (const group of groups) {
      const grossXof = Number(group.grossXof);
      const commissionXof = Math.floor(grossXof * env.PLATFORM_COMMISSION_BPS / 10_000);
      results.push(await db.settlement.upsert({
        where: { providerCode_periodStart_periodEnd: { providerCode: group.providerCode, periodStart, periodEnd } },
        create: {
          id: randomUUID(), providerCode: group.providerCode, periodStart, periodEnd,
          grossXof, commissionXof, netXof: grossXof - commissionXof, status: 'pending',
        },
        update: { grossXof, commissionXof, netXof: grossXof - commissionXof },
      }));
    }
    return results;
  },

  list() { return db.settlement.findMany({ orderBy: [{ periodStart: 'desc' }, { providerCode: 'asc' }], take: 100 }); },
};
