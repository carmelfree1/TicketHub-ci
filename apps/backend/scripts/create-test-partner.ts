import '../src/load-env.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/core/security/password.js';

const phone = '+2250700000000';
const password = 'TestPartner123';

async function main(): Promise<void> {
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { phone },
    update: {
      fullName: 'Compte Test Partner',
      passwordHash,
      role: 'partner',
    },
    create: {
      id: randomUUID(),
      fullName: 'Compte Test Partner',
      phone,
      passwordHash,
      role: 'partner',
    },
  });

  console.log(JSON.stringify({ phone, password, role: 'partner' }));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
