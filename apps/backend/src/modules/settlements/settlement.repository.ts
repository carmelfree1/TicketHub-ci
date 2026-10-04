import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';

const db = prisma;

export const settlementRepository = {
  /**
   * Totals the sale snapshots (order_items) of paid orders created in [periodStart, periodEnd), per company. Gross,
   * commission and net come from what was recorded at sale time, so a later change of commission rules never alters
   * a period that was already computed. Transport and event sales are both included.
   */
  async generate(periodStart: Date, periodEnd: Date) {
    const groups = await db.orderItem.groupBy({
      by: ['providerId'],
      where: { createdAt: { gte: periodStart, lt: periodEnd }, order: { status: 'paid' } },
      _sum: { lineTotalXof: true, commissionXof: true },
    });
    const providers = await db.provider.findMany({ where: { id: { in: groups.map((group) => group.providerId) } }, select: { id: true, code: true } });
    const codeById = new Map(providers.map((provider) => [provider.id, provider.code]));
    const results = [];
    for (const group of groups) {
      const providerCode = codeById.get(group.providerId);
      if (!providerCode) continue;
      const grossXof = group._sum.lineTotalXof ?? 0;
      const commissionXof = group._sum.commissionXof ?? 0;
      const amounts = { grossXof, commissionXof, netXof: grossXof - commissionXof };
      const key = { providerCode_periodStart_periodEnd: { providerCode, periodStart, periodEnd } };
      await db.settlement.upsert({
        where: key,
        create: { id: randomUUID(), providerCode, periodStart, periodEnd, ...amounts, status: 'pending' },
        update: {},
      });
      // An approved or paid settlement is final; only a pending one may be recomputed.
      await db.settlement.updateMany({ where: { providerCode, periodStart, periodEnd, status: 'pending' }, data: amounts });
      results.push(await db.settlement.findUniqueOrThrow({ where: key }));
    }
    return results;
  },

  /** pending -> approved. The conditional update makes a double approval or an approval of a paid settlement a no-op. */
  async approve(id: string, now = new Date()): Promise<boolean> {
    const result = await db.settlement.updateMany({ where: { id, status: 'pending' }, data: { status: 'approved', approvedAt: now } });
    return result.count === 1;
  },

  /** approved -> paid, recording the bank or mobile money transfer reference the operator used. */
  async markPaid(id: string, payoutReference: string, now = new Date()): Promise<boolean> {
    const result = await db.settlement.updateMany({ where: { id, status: 'approved' }, data: { status: 'paid', paidAt: now, payoutReference } });
    return result.count === 1;
  },

  /** pending or approved -> cancelled; a paid settlement can never be cancelled. */
  async cancel(id: string): Promise<boolean> {
    const result = await db.settlement.updateMany({ where: { id, status: { in: ['pending', 'approved'] } }, data: { status: 'cancelled' } });
    return result.count === 1;
  },

  findById(id: string) { return db.settlement.findUnique({ where: { id } }); },

  list(status?: string) {
    return db.settlement.findMany({ where: status ? { status } : {}, orderBy: [{ periodStart: 'desc' }, { providerCode: 'asc' }], take: 200 });
  },

  /** Only the companies the caller belongs to, never the whole platform. */
  listForProviders(providerCodes: string[]) {
    return db.settlement.findMany({
      where: { providerCode: { in: providerCodes } },
      orderBy: [{ periodStart: 'desc' }, { providerCode: 'asc' }],
      take: 100,
    });
  },
};
