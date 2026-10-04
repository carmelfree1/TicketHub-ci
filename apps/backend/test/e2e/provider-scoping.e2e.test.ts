import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { startE2eContext, type Session } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('company scoping, invitations, sale snapshots and settlements', { skip: !testDatabaseUrl, timeout: 180_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;
  let traveler: Session;
  const tag = randomUUID().slice(0, 8).toUpperCase();

  before(async () => {
    ctx = await startE2eContext(testDatabaseUrl!);
    traveler = await ctx.registerTraveler();
  });

  after(async () => {
    await ctx?.close();
  });

  const json = async <T = Record<string, unknown>>(response: Response) => (await response.json()) as T;
  const errorCode = async (response: Response) => (await json<{ error: { code: string } }>(response)).error.code;
  const scan = (session: Session, body: object) => ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify(body) }, session);

  /** A company of its own with one future departure, so these tests never depend on (or disturb) the seeded catalog. */
  async function createCompany(suffix: string, price = 10_000) {
    const code = `T${tag}${suffix}`;
    const provider = await ctx.prisma.provider.create({ data: { id: `prov-${code}`, code, name: `Société ${code}`, status: 'active' } });
    const trip = await ctx.prisma.busTrip.create({
      data: {
        id: `trip-${code}`, providerId: provider.id, carrier: provider.name, carrierCode: code, serviceTitle: 'Test',
        departAt: new Date(Date.now() + 48 * 60 * 60 * 1000), departStation: 'Gare A', departCity: 'Abidjan',
        arrivalStation: 'Gare B', arrivalCity: `Ville ${code}`, arrivalTime: '12:00', duration: '4h', priceXof: price,
        seatCapacity: 40, vehicle: 'Bus', registration: code,
      },
    });
    return { provider, trip };
  }

  /** Books and pays seats on a trip through the real endpoints, returning the booking and the issued ticket. */
  async function sell(tripId: string, seats: number[]) {
    const reserved = await ctx.reserve(traveler, tripId, seats);
    assert.equal(reserved.status, 201, await reserved.clone().text());
    const booking = (await json<{ data: { id: string; amount_xof: number } }>(reserved)).data;
    const payment = await ctx.startPayment(traveler, { ...booking, status: 'pending_payment', seats });
    const webhook = await ctx.sendWebhook({ reference: payment.providerReference, bookingId: booking.id, amount: booking.amount_xof });
    assert.equal(webhook.status, 200, await webhook.clone().text());
    const [ticket] = await ctx.walletTickets(traveler, booking.id);
    assert.ok(ticket);
    return { booking, reference: payment.providerReference, ticket };
  }

  describe('scanning is limited to the company that sold the ticket', () => {
    it('refuses a scanner of another company and leaves the ticket usable', async () => {
      const seller = await createCompany('A');
      const other = await createCompany('B');
      const { ticket } = await sell(seller.trip.id, [1]);
      const stranger = await ctx.registerPartnerFor(other.provider.id);

      const refused = await scan(stranger, { token: ticket.qrPayload });
      assert.equal(refused.status, 403);
      assert.equal(await errorCode(refused), 'WRONG_PROVIDER');

      const stored = await ctx.prisma.ticket.findFirstOrThrow({ where: { booking: { busTripId: seller.trip.id } } });
      assert.equal(stored.status, 'active', 'a refused scan must not consume the ticket');
      const event = await ctx.prisma.securityEvent.findFirst({ where: { eventType: 'ticket.wrong_provider_scan' }, orderBy: { createdAt: 'desc' } });
      assert.ok(event, 'a cross-company scan attempt is recorded as a security event');

      const owner = await ctx.registerPartnerFor(seller.provider.id);
      assert.equal((await scan(owner, { token: ticket.qrPayload })).status, 200);
    });

    it('accepts any role of the selling company', async () => {
      const seller = await createCompany('C');
      for (const [index, role] of (['scanner', 'manager', 'owner'] as const).entries()) {
        const { ticket } = await sell(seller.trip.id, [index + 1]);
        const member = await ctx.registerPartnerFor(seller.provider.id, role);
        assert.equal((await scan(member, { token: ticket.qrPayload })).status, 200, role);
      }
    });

    it('applies the same rule to event tickets', async () => {
      const events = (await json<{ data: Array<{ id: string; categories: Array<{ id: string }> }> }>(await ctx.api('/api/catalog/events'))).data;
      const event = events[0];
      assert.ok(event, 'run db:seed on the test database');
      const reserved = await ctx.api('/api/bookings/event', {
        method: 'POST',
        body: JSON.stringify({ eventId: event.id, categoryId: event.categories[0].id, quantity: 1 }),
      }, traveler);
      assert.equal(reserved.status, 201, await reserved.clone().text());
      const booking = (await json<{ data: { id: string; amount_xof: number } }>(reserved)).data;
      const payment = await ctx.startPayment(traveler, { ...booking, status: 'pending_payment', seats: [] });
      await ctx.sendWebhook({ reference: payment.providerReference, bookingId: booking.id, amount: booking.amount_xof });
      const [ticket] = await ctx.walletTickets(traveler, booking.id);

      const transportCompany = await createCompany('D');
      const wrong = await ctx.registerPartnerFor(transportCompany.provider.id);
      assert.equal(await errorCode(await scan(wrong, { token: ticket.qrPayload })), 'WRONG_PROVIDER');

      const organizer = await ctx.registerPartnerFor(await ctx.providerOfBooking(booking.id));
      assert.equal((await scan(organizer, { token: ticket.qrPayload })).status, 200);
    });

    it('limits manifests to the departures of the partner company', async () => {
      const first = await createCompany('E');
      const second = await createCompany('F');
      await sell(first.trip.id, [3]);
      const firstPartner = await ctx.registerPartnerFor(first.provider.id);
      const secondPartner = await ctx.registerPartnerFor(second.provider.id);

      const own = await ctx.api(`/api/partner/manifest/${first.trip.id}`, {}, firstPartner);
      assert.equal(own.status, 200);
      assert.equal((await json<{ data: unknown[] }>(own)).data.length, 1);
      const foreign = await ctx.api(`/api/partner/manifest/${first.trip.id}`, {}, secondPartner);
      assert.equal(foreign.status, 403);
      assert.equal(await errorCode(foreign), 'WRONG_PROVIDER');
      const missing = await ctx.api('/api/partner/manifest/does-not-exist', {}, firstPartner);
      assert.equal(missing.status, 404);
    });
  });

  describe('invitations', () => {
    const newPhone = () => `0${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
    const register = (code: string | undefined, phone = newPhone()) =>
      ctx.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Invité Test',
          phone,
          password: 'Test-only-password-482!',
          ...(code ? { partnerInviteCode: code } : {}),
        }),
      });

    it('rejects an unknown code instead of silently creating a traveler account', async () => {
      const phone = newPhone();
      const response = await register('INV-DOESNOTEXIST', phone);
      assert.equal(response.status, 400);
      assert.equal(await errorCode(response), 'INVALID_INVITE');
      assert.equal(await ctx.prisma.user.findUnique({ where: { phone: `+225${phone}` } }), null, 'no account is created for a bad code');
    });

    it('works once, then the code is spent', async () => {
      const company = await createCompany('G');
      const { createProviderInvite } = await import('../../src/modules/providers/provider-access.js');
      const invite = await createProviderInvite({ providerId: company.provider.id, role: 'manager', ttlDays: 1 });
      const first = await register(invite.code.toLowerCase());
      assert.equal(first.status, 201, await first.clone().text());
      const member = await ctx.prisma.providerMember.findFirstOrThrow({ where: { providerId: company.provider.id } });
      assert.equal(member.role, 'manager');
      const second = await register(invite.code);
      assert.equal(second.status, 400);
      assert.equal(await errorCode(second), 'INVALID_INVITE');
    });

    it('lets exactly one of several simultaneous sign-ups use a code', async () => {
      const company = await createCompany('H');
      const { createProviderInvite } = await import('../../src/modules/providers/provider-access.js');
      const invite = await createProviderInvite({ providerId: company.provider.id, role: 'scanner', ttlDays: 1 });
      const responses = await Promise.all(Array.from({ length: 4 }, () => register(invite.code)));
      const statuses = responses.map((response) => response.status).sort();
      assert.equal(statuses.filter((status) => status === 201).length, 1, `statuses: ${statuses.join(',')}`);
      assert.equal(await ctx.prisma.providerMember.count({ where: { providerId: company.provider.id } }), 1);
    });

    it('refuses expired invitations and invitations of a suspended company', async () => {
      const company = await createCompany('I');
      const { createProviderInvite } = await import('../../src/modules/providers/provider-access.js');
      const expired = await createProviderInvite({ providerId: company.provider.id, role: 'scanner', ttlDays: 1 });
      await ctx.prisma.providerInvite.updateMany({ where: { providerId: company.provider.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal(await errorCode(await register(expired.code)), 'INVALID_INVITE');

      const suspended = await createCompany('J');
      const invite = await createProviderInvite({ providerId: suspended.provider.id, role: 'scanner', ttlDays: 1 });
      await ctx.prisma.provider.update({ where: { id: suspended.provider.id }, data: { status: 'suspended' } });
      assert.equal(await errorCode(await register(invite.code)), 'INVALID_INVITE');
    });
  });

  describe('a suspended company', () => {
    it('disappears from the catalog and can no longer sell', async () => {
      const company = await createCompany('U');
      const event = await ctx.prisma.event.create({
        data: {
          id: `evt-${company.provider.code}`, providerId: company.provider.id, title: 'Soirée test', eventType: 'concert', venue: 'Salle', city: 'Abidjan',
          startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          categories: { create: [{ id: `cat-${company.provider.code}`, name: 'Standard', priceXof: 2_000, capacity: 50 }] },
        },
      });
      const listed = async () => ({
        trips: (await json<{ data: Array<{ id: string }> }>(await ctx.api(`/api/catalog/trips?to=${encodeURIComponent(company.trip.arrivalCity)}`))).data.some((trip) => trip.id === company.trip.id),
        events: (await json<{ data: Array<{ id: string }> }>(await ctx.api('/api/catalog/events'))).data.some((item) => item.id === event.id),
      });
      assert.deepEqual(await listed(), { trips: true, events: true });

      await ctx.prisma.provider.update({ where: { id: company.provider.id }, data: { status: 'suspended' } });
      assert.deepEqual(await listed(), { trips: false, events: false });
      assert.equal((await ctx.api(`/api/catalog/trips/${company.trip.id}/seats`)).status, 404);
      const trip = await ctx.reserve(traveler, company.trip.id, [1]);
      assert.equal(trip.status, 404);
      assert.equal(await errorCode(trip), 'TRIP_UNAVAILABLE');
      const eventBooking = await ctx.api('/api/bookings/event', {
        method: 'POST',
        body: JSON.stringify({ eventId: event.id, categoryId: `cat-${company.provider.code}`, quantity: 1 }),
      }, traveler);
      assert.equal(eventBooking.status, 404);
      assert.equal(await errorCode(eventBooking), 'EVENT_UNAVAILABLE');

      await ctx.prisma.provider.update({ where: { id: company.provider.id }, data: { status: 'active' } });
      assert.deepEqual(await listed(), { trips: true, events: true }, 'reactivation brings the offers back');
    });
  });

  describe('an unlinked partner account', () => {
    it('sees no company data and cannot read departures or settlements', async () => {
      const company = await createCompany('K');
      const partner = await ctx.registerPartnerFor(company.provider.id);
      await ctx.prisma.providerMember.deleteMany({ where: { providerId: company.provider.id } });

      const me = await json<{ data: { providers: unknown[] } }>(await ctx.api('/api/partner/me', {}, partner));
      assert.deepEqual(me.data.providers, []);
      for (const path of ['/api/partner/trips', '/api/partner/stats', '/api/partner/settlements']) {
        const response = await ctx.api(path, {}, partner);
        assert.equal(response.status, 403, path);
        assert.equal(await errorCode(response), 'NO_PROVIDER', path);
      }
    });

    it('cannot scan anything', async () => {
      const company = await createCompany('L');
      const { ticket } = await sell(company.trip.id, [5]);
      const partner = await ctx.registerPartnerFor(company.provider.id);
      await ctx.prisma.providerMember.deleteMany({ where: { userId: (await ctx.prisma.providerMember.findFirstOrThrow({ where: { providerId: company.provider.id } })).userId } });
      assert.equal(await errorCode(await scan(partner, { token: ticket.qrPayload })), 'WRONG_PROVIDER');
    });
  });

  describe('sale snapshots, commissions and settlements', () => {
    it('records what was sold with the commission in force at the time', async () => {
      const company = await createCompany('M', 10_000);
      await ctx.prisma.commissionRule.create({ data: { id: randomUUID(), providerId: company.provider.id, productType: 'transport', rateBps: 500 } });
      const { booking } = await sell(company.trip.id, [1, 2]);

      const item = await ctx.prisma.orderItem.findFirstOrThrow({ where: { order: { bookingId: booking.id } } });
      assert.equal(item.providerId, company.provider.id);
      assert.equal(item.quantity, 2);
      assert.equal(item.unitPriceXof, 10_000);
      assert.equal(item.lineTotalXof, 20_000);
      assert.equal(item.commissionBps, 500);
      assert.equal(item.commissionXof, 1_000);

      // A later rule change must not rewrite the sale that already happened.
      await ctx.prisma.commissionRule.updateMany({ where: { providerId: company.provider.id }, data: { rateBps: 2_000 } });
      const unchanged = await ctx.prisma.orderItem.findUniqueOrThrow({ where: { id: item.id } });
      assert.equal(unchanged.commissionXof, 1_000);
    });

    it('does not duplicate the snapshot when the webhook is replayed', async () => {
      const company = await createCompany('N');
      const { booking, reference } = await sell(company.trip.id, [1]);
      await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      await ctx.sendWebhook({ id: `second-${reference}`, reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(await ctx.prisma.orderItem.count({ where: { order: { bookingId: booking.id } } }), 1);
    });

    it('keeps a journal of the provider exchanges, one row per delivery', async () => {
      const company = await createCompany('O');
      const { booking, reference } = await sell(company.trip.id, [1]);
      await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      const rows = await ctx.prisma.paymentTransaction.findMany({ where: { payment: { bookingId: booking.id } }, orderBy: { createdAt: 'asc' } });
      assert.deepEqual(rows.map((row) => row.kind), ['checkout', 'webhook']);
      const webhook = rows[1];
      assert.equal(webhook.eventType, 'payment.success');
      assert.equal(webhook.amountXof, booking.amount_xof);
      assert.equal((webhook.payload as { data: { reference: string } }).data.reference, reference);
    });

    it('shows each partner only their own figures', async () => {
      const mine = await createCompany('P', 8_000);
      const theirs = await createCompany('Q', 5_000);
      await sell(mine.trip.id, [1, 2, 3]);
      await sell(theirs.trip.id, [1]);
      const partner = await ctx.registerPartnerFor(mine.provider.id);
      const stranger = await ctx.registerPartnerFor(theirs.provider.id);

      const stats = (await json<{ data: { grossXof: number; ticketsSold: number; netXof: number } }>(await ctx.api('/api/partner/stats?period=today', {}, partner))).data;
      assert.equal(stats.grossXof, 24_000);
      assert.equal(stats.ticketsSold, 3);
      const otherStats = (await json<{ data: { grossXof: number } }>(await ctx.api('/api/partner/stats?period=today', {}, stranger))).data;
      assert.equal(otherStats.grossXof, 5_000);

      const trips = (await json<{ data: Array<{ id: string; seatsSold: number }> }>(await ctx.api('/api/partner/trips', {}, partner))).data;
      assert.deepEqual(trips.map((trip) => trip.id), [mine.trip.id]);
      assert.equal(trips[0].seatsSold, 3);
    });

    it('settles transport and event sales from the snapshots, per company, and scopes the list', async () => {
      const company = await createCompany('R', 10_000);
      await ctx.prisma.commissionRule.create({ data: { id: randomUUID(), providerId: company.provider.id, rateBps: 1_000 } });
      await sell(company.trip.id, [1, 2]);
      const { settlementService } = await import('../../src/modules/settlements/settlement.service.js');
      const start = new Date(Date.now() - 60 * 60 * 1000);
      const end = new Date(Date.now() + 60 * 60 * 1000);
      const results = await settlementService.generate(start, end);
      const mine = results.find((settlement) => settlement.providerCode === company.provider.code);
      assert.ok(mine);
      assert.equal(mine.grossXof, 20_000);
      assert.equal(mine.commissionXof, 2_000);
      assert.equal(mine.netXof, 18_000);

      // Re-running recomputes a pending settlement but never touches an approved one.
      await settlementService.generate(start, end);
      // Other test files compute their own overlapping windows, so only this window is counted.
      assert.equal(await ctx.prisma.settlement.count({ where: { providerCode: company.provider.code, periodStart: start, periodEnd: end } }), 1);
      await settlementService.approve(mine.id);
      await sell(company.trip.id, [3]);
      await settlementService.generate(start, end);
      assert.equal((await ctx.prisma.settlement.findUniqueOrThrow({ where: { id: mine.id } })).grossXof, 20_000);

      const partner = await ctx.registerPartnerFor(company.provider.id);
      const outsider = await ctx.registerPartnerFor((await createCompany('S')).provider.id);
      const visible = (await json<{ data: Array<{ providerCode: string }> }>(await ctx.api('/api/partner/settlements', {}, partner))).data;
      assert.ok(visible.length >= 1 && visible.every((row) => row.providerCode === company.provider.code));
      const hidden = (await json<{ data: Array<{ providerCode: string }> }>(await ctx.api('/api/partner/settlements', {}, outsider))).data;
      assert.ok(hidden.every((row) => row.providerCode !== company.provider.code));
    });
  });

  describe('database integrity rules', () => {
    it('rejects a sale snapshot whose total or commission is inconsistent', async () => {
      const company = await createCompany('T');
      const { booking } = await sell(company.trip.id, [1]);
      const order = await ctx.prisma.order.findUniqueOrThrow({ where: { bookingId: booking.id } });
      const insert = (line: number, commission: number) =>
        ctx.prisma.$executeRaw`
          INSERT INTO order_items (id, order_id, provider_id, product_type, description, quantity, unit_price_xof, line_total_xof, commission_bps, commission_xof)
          VALUES (${randomUUID()}, ${order.id}, ${company.provider.id}, 'transport', 'x', 2, 100, ${line}, 0, ${commission})`;
      await assert.rejects(insert(150, 0), 'line total must equal quantity times unit price');
      await assert.rejects(insert(200, 201), 'commission cannot exceed the amount paid');
      assert.equal(await insert(200, 200), 1);
    });

    it('rejects a settlement whose net is not gross minus commission', async () => {
      await assert.rejects(ctx.prisma.settlement.create({
        data: { id: randomUUID(), providerCode: `BAD${tag}`, periodStart: new Date(0), periodEnd: new Date(1), grossXof: 100, commissionXof: 10, netXof: 95 },
      }));
    });
  });
});
