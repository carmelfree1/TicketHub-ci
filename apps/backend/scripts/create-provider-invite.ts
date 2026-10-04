/**
 * Issues a single-use invitation that links a new partner account to one company.
 *
 *   pnpm --filter @tickethub/backend exec tsx scripts/create-provider-invite.ts UTB scanner 7
 *                                                                              code role  days
 *
 * The clear code is printed once and never stored; give it to the person through a channel you trust.
 */
import '../src/load-env.js';
import { prisma } from '../src/config/database.js';
import { createProviderInvite, type ProviderRole } from '../src/modules/providers/provider-access.js';

const roles: ProviderRole[] = ['owner', 'manager', 'scanner'];

async function main(): Promise<void> {
  const [code, role = 'scanner', days = '7'] = process.argv.slice(2);
  if (!code || !roles.includes(role as ProviderRole) || !Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 90) {
    console.error('Usage: create-provider-invite.ts <PROVIDER_CODE> [owner|manager|scanner] [days 1-90]');
    process.exitCode = 1;
    return;
  }
  const provider = await prisma.provider.findUnique({ where: { code } });
  if (!provider || provider.status !== 'active') {
    console.error(`No active provider with code "${code}".`);
    process.exitCode = 1;
    return;
  }
  const invite = await createProviderInvite({ providerId: provider.id, role: role as ProviderRole, ttlDays: Number(days) });
  console.log(JSON.stringify({ provider: provider.name, role, code: invite.code, expiresAt: invite.expiresAt.toISOString() }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
