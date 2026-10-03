import assert from 'node:assert/strict';
import test from 'node:test';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test('PostgreSQL schema contains the TicketHub persistence modules', { skip: !testDatabaseUrl, timeout: 30_000 }, async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDatabaseUrl!;
  process.env.JWT_SECRET = 'integration-only-jwt-secret-at-least-32-chars';
  process.env.TICKET_SIGNING_SECRET = 'integration-only-ticket-secret-at-least-32-chars';
  process.env.REDIS_URL = '';

  const { connectDatabase, disconnectDatabase, prisma } = await import('../../src/config/database.js');
  try {
    await connectDatabase();
    const relations = await (prisma as any).$queryRaw`
      SELECT
        to_regclass('public.users') AS users,
        to_regclass('public.bookings') AS bookings,
        to_regclass('public.payments') AS payments,
        to_regclass('public.orders') AS orders,
        to_regclass('public.tickets') AS tickets,
        to_regclass('public.refunds') AS refunds,
        to_regclass('public.settlements') AS settlements,
        to_regclass('public.notifications') AS notifications`;
    const schema = relations[0];
    for (const table of ['users', 'bookings', 'payments', 'orders', 'tickets', 'refunds', 'settlements', 'notifications']) {
      assert.ok(schema[table], `Expected public.${table}; run npm run db:migrate against TEST_DATABASE_URL first.`);
    }
  } finally {
    await disconnectDatabase();
  }
});
