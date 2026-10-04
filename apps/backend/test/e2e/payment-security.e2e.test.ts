import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startE2eContext } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('payment, webhook and booking invariants', { skip: !testDatabaseUrl, timeout: 120_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;
  let traveler: Awaited<ReturnType<typeof ctx.registerTraveler>>;
  let partner: Awaited<ReturnType<typeof ctx.registerPartner>>;

  before(async () => {
    ctx = await startE2eContext(testDatabaseUrl!);
    traveler = await ctx.registerTraveler();
    partner = await ctx.registerPartner();
  });

  after(async () => {
    await ctx?.close();
  });

  async function paidBooking(seatCount = 1) {
    const booking = await ctx.reserveOk(traveler, seatCount);
    const { providerReference } = await ctx.startPayment(traveler, booking);
    return { booking, reference: providerReference };
  }

  async function bookingState(id: string) {
    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id }, include: { payment: true, tickets: true } });
    return { booking: booking.status, payment: booking.payment?.status, tickets: booking.tickets.length };
  }

  describe('webhook authenticity', () => {
    it('rejects a bad signature without changing anything', async () => {
      const { booking, reference } = await paidBooking();
      const response = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof, secret: 'wrong-secret-wrong-secret-wrong-secret' });
      assert.equal(response.status, 401);
      assert.deepEqual(await bookingState(booking.id), { booking: 'pending_payment', payment: 'pending', tickets: 0 });
    });

    it('rejects a stale timestamp even when the signature is valid for it', async () => {
      const { booking, reference } = await paidBooking();
      const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600);
      const response = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof, timestamp: staleTimestamp });
      assert.equal(response.status, 401);
      assert.equal((await bookingState(booking.id)).tickets, 0);
    });

    it('rejects a request with no signature headers', async () => {
      const { booking, reference } = await paidBooking();
      const { rawBody } = ctx.webhookRequest({ reference, bookingId: booking.id, amount: booking.amount_xof });
      const response = await ctx.api('/api/webhooks/geniuspay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: rawBody });
      assert.equal(response.status, 401);
      assert.equal((await bookingState(booking.id)).tickets, 0);
    });
  });

  describe('webhook payload validation', () => {
    it('refuses an amount different from the booked amount and allows a corrected retry', async () => {
      const { booking, reference } = await paidBooking();
      const underpaid = await ctx.sendWebhook({ id: `retry-${reference}`, reference, bookingId: booking.id, amount: booking.amount_xof - 1 });
      assert.equal(underpaid.status, 409);
      assert.deepEqual(await bookingState(booking.id), { booking: 'pending_payment', payment: 'pending', tickets: 0 });

      // The rejected delivery id must not be burned: the same delivery is accepted once the amount is right.
      const correct = await ctx.sendWebhook({ id: `retry-${reference}`, reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(correct.status, 200);
      assert.deepEqual(await bookingState(booking.id), { booking: 'paid', payment: 'completed', tickets: 1 });
    });

    it('refuses a foreign currency', async () => {
      const { booking, reference } = await paidBooking();
      const response = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof, currency: 'EUR' });
      assert.equal(response.status, 409);
      assert.equal((await bookingState(booking.id)).tickets, 0);
    });

    it('refuses a provider reference that does not belong to the booking', async () => {
      const { booking } = await paidBooking();
      const response = await ctx.sendWebhook({ reference: 'someone-elses-reference', bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(response.status, 404);
      assert.equal((await bookingState(booking.id)).tickets, 0);
    });

    it('does not issue tickets for a success event whose status is not completed', async () => {
      const { booking, reference } = await paidBooking();
      const response = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof, status: 'pending' });
      assert.equal(response.status, 200);
      assert.deepEqual(await bookingState(booking.id), { booking: 'pending_payment', payment: 'pending', tickets: 0 });
    });
  });

  describe('idempotency', () => {
    it('issues exactly one ticket per seat and ignores a replayed delivery', async () => {
      const { booking, reference } = await paidBooking(2);
      const first = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.deepEqual(await first.json(), { accepted: true, duplicate: false });
      const replay = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.deepEqual(await replay.json(), { accepted: true, duplicate: true });
      assert.equal((await bookingState(booking.id)).tickets, 2);
      assert.equal(await ctx.prisma.order.count({ where: { bookingId: booking.id } }), 1);
    });

    it('issues one set of tickets when the same delivery arrives concurrently', async () => {
      const { booking, reference } = await paidBooking(2);
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof })),
      );
      for (const response of responses) assert.ok([200, 409, 500, 503].includes(response.status), `unexpected ${response.status}`);
      assert.ok(responses.some((response) => response.status === 200), 'at least one delivery must succeed');
      assert.deepEqual(await bookingState(booking.id), { booking: 'paid', payment: 'completed', tickets: 2 });
      assert.equal(await ctx.prisma.order.count({ where: { bookingId: booking.id } }), 1);
    });

    it('does not issue extra tickets when a different delivery repeats a success', async () => {
      const { booking, reference } = await paidBooking();
      await ctx.sendWebhook({ id: `a-${reference}`, reference, bookingId: booking.id, amount: booking.amount_xof });
      const second = await ctx.sendWebhook({ id: `b-${reference}`, reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(second.status, 200);
      assert.equal((await bookingState(booking.id)).tickets, 1);
    });
  });

  describe('payment outcomes', () => {
    it('marks the booking failed on payment.failed and frees the seats', async () => {
      const { booking, reference } = await paidBooking();
      const response = await ctx.sendWebhook({ event: 'payment.failed', status: 'failed', reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(response.status, 200);
      assert.deepEqual(await bookingState(booking.id), { booking: 'failed', payment: 'failed', tickets: 0 });

      const tripId = (await ctx.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).busTripId!;
      const rebook = await ctx.reserve(traveler, tripId, booking.seats);
      assert.equal(rebook.status, 201, 'seats of a failed payment must be bookable again');
    });

    it('sends a payment confirmed after the hold expired to manual review without tickets', async () => {
      const { booking, reference } = await paidBooking();
      await ctx.prisma.booking.update({ where: { id: booking.id }, data: { holdExpiresAt: new Date(Date.now() - 60_000) } });
      const response = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(response.status, 200);
      assert.deepEqual(await bookingState(booking.id), { booking: 'needs_review', payment: 'needs_review', tickets: 0 });
    });

    it('does not resurrect a failed booking when a late success arrives', async () => {
      const { booking, reference } = await paidBooking();
      await ctx.sendWebhook({ id: `f-${reference}`, event: 'payment.failed', status: 'failed', reference, bookingId: booking.id, amount: booking.amount_xof });
      const late = await ctx.sendWebhook({ id: `s-${reference}`, reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(late.status, 200);
      assert.equal((await bookingState(booking.id)).tickets, 0);
    });
  });

  describe('double booking and double payment', () => {
    it('lets exactly one of several concurrent buyers take the same seat', async () => {
      const buyers = await Promise.all(Array.from({ length: 3 }, (_, index) => ctx.registerTraveler(`Acheteur ${index}`)));
      const { tripId, seats } = await ctx.freeSeats(1);
      const responses = await Promise.all(buyers.map((buyer) => ctx.reserve(buyer, tripId, seats)));
      const statuses = responses.map((response) => response.status).sort();
      assert.equal(statuses.filter((status) => status === 201).length, 1, `statuses: ${statuses.join(',')}`);
      assert.ok(statuses.filter((status) => status !== 201).every((status) => status === 409), `statuses: ${statuses.join(',')}`);
    });

    it('creates a single provider payment for concurrent checkout requests on one booking', async () => {
      const booking = await ctx.reserveOk(traveler);
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          ctx.api(`/api/bookings/${encodeURIComponent(booking.id)}/payment`, { method: 'POST', body: JSON.stringify({ paymentMethod: 'wave' }) }, traveler),
        ),
      );
      assert.ok(responses.some((response) => response.status === 201), 'one request must create the checkout');
      assert.equal(await ctx.prisma.payment.count({ where: { bookingId: booking.id } }), 1);
    });

    it('prevents another user from paying for a booking they do not own', async () => {
      const booking = await ctx.reserveOk(traveler);
      const stranger = await ctx.registerTraveler('Autre utilisateur');
      const response = await ctx.api(`/api/bookings/${encodeURIComponent(booking.id)}/payment`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'wave' }),
      }, stranger);
      assert.ok([403, 404].includes(response.status), `status ${response.status}`);
      assert.equal(await ctx.prisma.payment.count({ where: { bookingId: booking.id } }), 0);
    });
  });

  describe('ticket scanning', () => {
    async function issuedTicket() {
      const { booking, reference } = await paidBooking();
      await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      const [ticket] = await ctx.walletTickets(traveler, booking.id);
      assert.ok(ticket?.qrPayload);
      return ticket;
    }

    const scan = (token: string, session = partner) => ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ token }) }, session);

    it('accepts a concurrent burst of scans for the same ticket exactly once', async () => {
      const ticket = await issuedTicket();
      const responses = await Promise.all(Array.from({ length: 6 }, () => scan(ticket.qrPayload)));
      const statuses = responses.map((response) => response.status);
      assert.equal(statuses.filter((status) => status === 200).length, 1, `statuses: ${statuses.join(',')}`);
      assert.ok(statuses.filter((status) => status !== 200).every((status) => status === 409), `statuses: ${statuses.join(',')}`);
    });

    it('rejects a scan from a traveler account', async () => {
      const ticket = await issuedTicket();
      const response = await scan(ticket.qrPayload, traveler);
      assert.equal(response.status, 403);
    });

    it('rejects a scan without authentication and a forged token', async () => {
      const ticket = await issuedTicket();
      const anonymous = await ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ token: ticket.qrPayload }) });
      assert.equal(anonymous.status, 401);
      const [payload] = ticket.qrPayload.split('.');
      const forged = await scan(`${payload}.${'A'.repeat(43)}`);
      assert.equal(forged.status, 401);
    });
  });
});
