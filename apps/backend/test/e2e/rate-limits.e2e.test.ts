import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startE2eContext } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('sensitive endpoint rate limits', { skip: !testDatabaseUrl, timeout: 120_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;

  before(async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '8';
    process.env.MFA_RATE_LIMIT_MAX = '3';
    process.env.PAYMENT_RATE_LIMIT_MAX = '3';
    process.env.RESERVATION_RATE_LIMIT_MAX = '3';
    process.env.SCAN_RATE_LIMIT_MAX = '3';
    ctx = await startE2eContext(testDatabaseUrl!);
  });

  after(async () => {
    await ctx?.close();
  });

  const codeOf = async (response: Response) => ((await response.json()) as { error?: { code?: string } }).error?.code;

  it('limits reservations per user, not per address', async () => {
    const first = await ctx.registerTraveler('Premier');
    const second = await ctx.registerTraveler('Second');
    const { tripId, seats } = await ctx.freeSeats(5);
    for (const seat of seats.slice(0, 3)) assert.equal((await ctx.reserve(first, tripId, [seat])).status, 201);
    const blocked = await ctx.reserve(first, tripId, [seats[3]]);
    assert.equal(blocked.status, 429);
    assert.equal(await codeOf(blocked), 'RESERVATION_RATE_LIMIT');
    assert.ok(blocked.headers.get('ratelimit') || blocked.headers.get('retry-after'), 'clients are told when to retry');
    assert.equal((await ctx.reserve(second, tripId, [seats[4]])).status, 201, 'another user shares the address but not the budget');
  });

  it('limits payment initiation per user', async () => {
    const traveler = await ctx.registerTraveler('Payeur');
    const booking = await ctx.reserveOk(traveler);
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await ctx.api(`/api/bookings/${encodeURIComponent(booking.id)}/payment`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'wave' }),
      }, traveler);
      statuses.push(response.status);
      if (response.status === 429) assert.equal(await codeOf(response), 'PAYMENT_RATE_LIMIT');
    }
    assert.equal(statuses.filter((status) => status === 429).length, 2, `statuses: ${statuses.join(',')}`);
  });

  it('limits scanning per partner', async () => {
    const partner = await ctx.registerPartnerFor(await ctx.providerIdByCode('UTB'));
    const scan = () => ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ ticketCode: 'TKH-AAAAAA-BBBBBB' }) }, partner);
    for (let attempt = 0; attempt < 3; attempt += 1) assert.equal((await scan()).status, 404);
    const blocked = await scan();
    assert.equal(blocked.status, 429);
    assert.equal(await codeOf(blocked), 'SCAN_RATE_LIMIT');
  });

  it('limits second-factor guesses', async () => {
    const attempt = () => ctx.api('/api/auth/login/mfa', { method: 'POST', body: JSON.stringify({ challengeToken: 'x'.repeat(40), code: '000000' }) });
    for (let count = 0; count < 3; count += 1) assert.equal((await attempt()).status, 401);
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.equal(await codeOf(blocked), 'MFA_RATE_LIMIT');
  });

  it('limits login attempts per address', async () => {
    // Earlier tests already spent part of the shared authentication budget through registrations.
    let blocked: Response | undefined;
    for (let attempt = 0; attempt < 10 && !blocked; attempt += 1) {
      const response = await ctx.api('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone: '0700000002', password: 'whatever-123456' }) });
      if (response.status === 429) blocked = response;
    }
    assert.ok(blocked, 'the login endpoint must start refusing requests');
    assert.equal(await codeOf(blocked), 'AUTH_RATE_LIMIT');
  });
});
