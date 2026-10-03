import { settlementService } from '../../modules/settlements/settlement.service.js';

export async function generateDailySettlementsJob(now = new Date()): Promise<number> {
  const periodEnd = new Date(now);
  periodEnd.setUTCHours(0, 0, 0, 0);
  const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);
  const generated = await settlementService.generate(periodStart, periodEnd);
  return generated.length;
}
