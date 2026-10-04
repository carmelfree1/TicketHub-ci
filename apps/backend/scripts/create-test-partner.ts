/**
 * Local development helper: creates a partner account linked to the seeded UTB company so the partner screens can
 * be tried by hand. It refuses to run in production and prints the throwaway password it generated.
 */
import '../src/load-env.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { env } from '../src/config/env.js';
import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/core/security/password.js';

const phone = '+2250700000000';
const providerCode = 'UTB';

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to create a test account in production.');
  const provider = await prisma.provider.findUnique({ where: { code: providerCode } });
  if (!provider) throw new Error(`Provider ${providerCode} not found; run pnpm db:seed first.`);

  const password = `Dev-${randomBytes(9).toString('base64url')}`;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { phone },
    update: { fullName: 'Compte Test Partner', passwordHash, role: 'partner', failedLoginCount: 0, lockedUntil: null },
    create: { id: randomUUID(), fullName: 'Compte Test Partner', phone, passwordHash, role: 'partner' },
  });
  await prisma.providerMember.upsert({
    where: { providerId_userId: { providerId: provider.id, userId: user.id } },
    update: { role: 'manager' },
    create: { providerId: provider.id, userId: user.id, role: 'manager' },
  });

  console.log(JSON.stringify({ phone, password, role: 'partner', provider: provider.name }));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
