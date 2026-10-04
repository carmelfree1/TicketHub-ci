/**
 * Operator tool for company payouts. TicketHub computes what each company is owed; the transfer itself is made by
 * a person (the payment gateway documents no payout endpoint), who then records its reference here.
 *
 *   tsx scripts/settlements.ts list [pending|approved|paid|cancelled]
 *   tsx scripts/settlements.ts generate <periodStartISO> <periodEndISO>
 *   tsx scripts/settlements.ts approve <id>
 *   tsx scripts/settlements.ts paid <id> <transferReference>
 *   tsx scripts/settlements.ts cancel <id>
 */
import '../src/load-env.js';
import { prisma } from '../src/config/database.js';
import { settlementService } from '../src/modules/settlements/settlement.service.js';

async function main(): Promise<void> {
  const [command, first, second] = process.argv.slice(2);
  switch (command) {
    case 'list':
      console.table((await settlementService.list(first)).map((s) => ({
        id: s.id, company: s.providerCode, from: s.periodStart.toISOString().slice(0, 10), to: s.periodEnd.toISOString().slice(0, 10),
        gross: s.grossXof, commission: s.commissionXof, net: s.netXof, status: s.status, transfer: s.payoutReference ?? '',
      })));
      return;
    case 'generate': {
      const start = new Date(first ?? '');
      const end = new Date(second ?? '');
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error('Usage: generate <periodStartISO> <periodEndISO>');
      console.log(`${(await settlementService.generate(start, end)).length} settlement(s) computed`);
      return;
    }
    case 'approve':
      await settlementService.approve(first ?? '');
      console.log('approved');
      return;
    case 'paid':
      await settlementService.markPaid(first ?? '', second ?? '');
      console.log('marked paid');
      return;
    case 'cancel':
      await settlementService.cancel(first ?? '');
      console.log('cancelled');
      return;
    default:
      throw new Error('Usage: settlements.ts list|generate|approve|paid|cancel (see the file header)');
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
