import { env } from '../../config/env.js';
import type { DbTransaction } from '../../config/database.js';

export interface CommissionRuleRow {
  providerId: string | null;
  productType: string | null;
  rateBps: number;
  minXof: number | null;
  createdAt: Date;
}

export interface Commission {
  bps: number;
  xof: number;
}

/**
 * Picks the most specific active rule: provider + product type, then provider, then product type, then a
 * platform wide rule. The newest rule wins a tie. Without any rule, PLATFORM_COMMISSION_BPS applies.
 */
export function selectCommissionRule(rules: CommissionRuleRow[], providerId: string, productType: string): CommissionRuleRow | null {
  const scored = rules
    .filter((rule) => (rule.providerId === null || rule.providerId === providerId) && (rule.productType === null || rule.productType === productType))
    .map((rule) => ({ rule, score: (rule.providerId === providerId ? 2 : 0) + (rule.productType === productType ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || b.rule.createdAt.getTime() - a.rule.createdAt.getTime());
  return scored[0]?.rule ?? null;
}

/** Commission never exceeds the amount paid and is rounded down to a whole franc. */
export function computeCommission(lineTotalXof: number, rule: Pick<CommissionRuleRow, 'rateBps' | 'minXof'> | null, defaultBps: number): Commission {
  const bps = rule ? rule.rateBps : defaultBps;
  const proportional = Math.floor((lineTotalXof * bps) / 10_000);
  const withMinimum = rule?.minXof ? Math.max(proportional, rule.minXof) : proportional;
  return { bps, xof: Math.min(withMinimum, lineTotalXof) };
}

export const commissionService = {
  async resolve(tx: DbTransaction, input: { providerId: string; productType: string; lineTotalXof: number }): Promise<Commission> {
    const rules = await tx.commissionRule.findMany({
      where: { active: true, OR: [{ providerId: input.providerId }, { providerId: null }] },
    });
    return computeCommission(input.lineTotalXof, selectCommissionRule(rules, input.providerId, input.productType), env.PLATFORM_COMMISSION_BPS);
  },
};
