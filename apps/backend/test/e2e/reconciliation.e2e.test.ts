import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { startE2eContext, type Session } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe('payment reconciliation, refunds, notifications and settlement lifecycle', { skip: !testDatabaseUrl, timeout: 180_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;
  let traveler: Session;
  let lookupPayment: typeof import('../../src/jobs/payments/reconcile-payments.job.js').lookupPayment;
  let sendToReview: typeof import('../../src/jobs/payments/reconcile-payments.job.js').sendToReview;
  const tag = randomUUID().slice(0, 8).toUpperCase();

  before(async () => {
    ctx = await startE2eContext(testDatabaseUrl!);
    traveler = await ctx.registerTraveler();
    ({ lookupPayment, sendToReview } = await import('../../src/jobs/payments/reconcile-payments.job.js'));
  });

  after(async () => {
    await ctx?.close();
  });

  const json = async <T = Record<string, unknown>>(response: Response) => (await response.json()) as T;

  /** A company with its own departure, so these tests never depend on the shared catalog or other test files. */
  async function createCompany(suffix: string, price = 6_000) {
    const code = `R${tag}${suffix}`;
    const provider = await ctx.prisma.provider.create({ data: { id: `prov-${code}`, code, name: `Société ${code}`, status: 'active' } });
    const trip = await ctx.prisma.busTrip.create({
      data: {
        id: `trip-${code}`, providerId: provider.id, carrier: provider.name, carrierCode: code, serviceTitle: 'Test',
        departAt: new Date(Date.now() + 48 * 60 * 60 * 1000), departStation: 'Gare A', departCity: 'Abidjan',
        arrivalStation: 'Gare B', arrivalCity: 'Bouaké', arrivalTime: '12:00', duration: '4h', priceXof: price,
        seatCapacity: 40, vehicle: 'Bus', registration: code,
      },
    });
    return { provider, trip };
  }

  /** Reserves and starts a payment but sends no webhook, as if the gateway's notification got lost. */
  async function startedPayment(tripId: string, seats = [1], who: Session = traveler) {
    const reserved = await ctx.reserve(who, tripId, seats);
    assert.equal(reserved.status, 201, await reserved.clone().text());
    const booking = (await json<{ data: { id: string; amount_xof: number } }>(reserved)).data;
    const payment = await ctx.startPayment(who, { ...booking, status: 'pending_payment', seats });
    const row = await ctx.prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.id } });
    return { booking, reference: payment.providerReference, paymentId: row.id };
  }

  const state = async (bookingId: string) => {
    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { payment: true, tickets: true, order: true } });
    return { booking: booking.status, payment: booking.payment?.status, tickets: booking.tickets.map((t) => t.status), order: booking.order?.status ?? null };
  };

  const waitFor = async (check: () => boolean | Promise<boolean>, what: string) => {
    for (let i = 0; i < 60; i += 1) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`timed out waiting for ${what}`);
  };

  const smsFor = (bookingId: string) => ctx.sms.filter((message) => message.payload.message.includes(bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()));

  describe('catching up when a webhook is lost', () => {
    it('confirms a payment the gateway reports as completed, once, and tells the customer', async () => {
      const company = await createCompany('A');
      const { booking, reference, paymentId } = await startedPayment(company.trip.id, [1, 2]);
      ctx.gatewayPayments.set(reference, { status: 'completed', amount: booking.amount_xof, currency: 'XOF' });

      assert.equal(await lookupPayment(paymentId, reference), 'applied');
      assert.deepEqual(await state(booking.id), { booking: 'paid', payment: 'completed', tickets: ['active', 'active'], order: 'paid' });
      assert.equal(await ctx.prisma.orderItem.count({ where: { order: { bookingId: booking.id } } }), 1);
      const journal = await ctx.prisma.paymentTransaction.findMany({ where: { paymentId }, orderBy: { createdAt: 'asc' } });
      assert.deepEqual(journal.map((row) => row.kind), ['checkout', 'reconciliation']);

      await waitFor(() => smsFor(booking.id).length === 1, 'the confirmation text message');
      assert.match(smsFor(booking.id)[0].payload.message, /paiement confirmé/);

      // Looking again, or receiving the real webhook afterwards, must change nothing.
      assert.equal(await lookupPayment(paymentId, reference), 'waiting');
      const late = await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(late.status, 200);
      assert.deepEqual((await state(booking.id)).tickets, ['active', 'active']);
      assert.equal(await ctx.prisma.orderItem.count({ where: { order: { bookingId: booking.id } } }), 1);
      assert.equal(smsFor(booking.id).length, 1, 'no second message');
    });

    it('records a failure reported by the gateway and frees the seats', async () => {
      const company = await createCompany('B');
      const { booking, reference, paymentId } = await startedPayment(company.trip.id, [3]);
      ctx.gatewayPayments.set(reference, { status: 'failed', amount: booking.amount_xof, currency: 'XOF' });
      assert.equal(await lookupPayment(paymentId, reference), 'applied');
      assert.deepEqual(await state(booking.id), { booking: 'failed', payment: 'failed', tickets: [], order: 'failed' });
      await waitFor(() => smsFor(booking.id).some((m) => m.template === 'payment_failed'), 'the failure message');
      const again = await ctx.reserve(traveler, company.trip.id, [3]);
      assert.equal(again.status, 201, 'the seat can be booked again');
    });

    it('leaves a payment alone while the gateway says it is still waiting', async () => {
      const company = await createCompany('C');
      for (const status of ['pending', 'processing']) {
        const { booking, reference, paymentId } = await startedPayment(company.trip.id, [status === 'pending' ? 4 : 5]);
        ctx.gatewayPayments.set(reference, { status, amount: booking.amount_xof, currency: 'XOF' });
        assert.equal(await lookupPayment(paymentId, reference), 'waiting', status);
        assert.equal((await state(booking.id)).payment, 'pending', status);
      }
    });

    it('does not trust an amount or a currency that differs from the booking', async () => {
      const company = await createCompany('D');
      const { booking, reference, paymentId } = await startedPayment(company.trip.id, [6]);
      ctx.gatewayPayments.set(reference, { status: 'completed', amount: booking.amount_xof - 1, currency: 'XOF' });
      assert.equal(await lookupPayment(paymentId, reference), 'waiting');
      ctx.gatewayPayments.set(reference, { status: 'completed', amount: booking.amount_xof, currency: 'EUR' });
      assert.equal(await lookupPayment(paymentId, reference), 'waiting');
      assert.deepEqual(await state(booking.id), { booking: 'pending_payment', payment: 'pending', tickets: [], order: 'pending_payment' });
    });

    it('survives gateway outages and unknown references without changing anything', async () => {
      const company = await createCompany('E');
      const { booking, reference, paymentId } = await startedPayment(company.trip.id, [7]);
      assert.equal(await lookupPayment(paymentId, reference), 'waiting', 'unknown reference (404)');
      ctx.gatewayFailures.add(reference);
      assert.equal(await lookupPayment(paymentId, reference), 'failed', 'gateway error (500)');
      assert.equal((await state(booking.id)).payment, 'pending');
    });

    it('never issues a ticket for seats that were already released', async () => {
      const company = await createCompany('F');
      const { booking, reference, paymentId } = await startedPayment(company.trip.id, [8]);
      await ctx.prisma.booking.update({ where: { id: booking.id }, data: { holdExpiresAt: new Date(Date.now() - 60_000) } });
      ctx.gatewayPayments.set(reference, { status: 'completed', amount: booking.amount_xof, currency: 'XOF' });
      assert.equal(await lookupPayment(paymentId, reference), 'applied');
      assert.deepEqual(await state(booking.id), { booking: 'needs_review', payment: 'needs_review', tickets: [], order: 'needs_review' });
      await waitFor(() => smsFor(booking.id).some((m) => m.template === 'payment_under_review'), 'the review message');
    });

    it('sends payments that stay unresolved to manual review, once', async () => {
      const company = await createCompany('G');
      const { booking, paymentId } = await startedPayment(company.trip.id, [9]);
      assert.equal(await sendToReview(paymentId, booking.id), true);
      assert.deepEqual(await state(booking.id), { booking: 'needs_review', payment: 'needs_review', tickets: [], order: 'needs_review' });
      assert.equal(await sendToReview(paymentId, booking.id), false, 'already handled');
      await waitFor(() => smsFor(booking.id).length === 1, 'exactly one review message');
    });
  });

  describe('refunds reported by the gateway', () => {
    async function paidTickets(suffix: string, seats: number[]) {
      const company = await createCompany(suffix);
      const started = await startedPayment(company.trip.id, seats);
      await ctx.sendWebhook({ reference: started.reference, bookingId: started.booking.id, amount: started.booking.amount_xof });
      const scanner = await ctx.registerPartnerFor(company.provider.id);
      const tickets = await ctx.walletTickets(traveler, started.booking.id);
      return { ...started, company, scanner, tickets };
    }
    const scan = (session: Session, token: string) => ctx.api('/api/partner/scans', { method: 'POST', body: JSON.stringify({ token }) }, session);

    it('cancels unused tickets, keeps used ones, and stops them opening doors', async () => {
      const { booking, reference, scanner, tickets } = await paidTickets('H', [1, 2]);
      assert.equal((await scan(scanner, tickets[0].qrPayload)).status, 200, 'first ticket is used before the refund');

      const refund = await ctx.sendWebhook({ id: `refund-${reference}`, event: 'payment.refunded', status: 'refunded', reference, bookingId: booking.id, amount: booking.amount_xof });
      assert.equal(refund.status, 200, await refund.clone().text());

      const stored = await ctx.prisma.ticket.findMany({ where: { bookingId: booking.id }, orderBy: { ordinal: 'asc' } });
      assert.deepEqual(stored.map((t) => t.status).sort(), ['cancelled', 'used']);
      const after = await state(booking.id);
      assert.equal(after.payment, 'refunded');
      assert.equal(after.order, 'refunded');
      const refundRow = await ctx.prisma.refund.findFirstOrThrow({ where: { order: { bookingId: booking.id } } });
      assert.equal(refundRow.status, 'completed');

      const remaining = stored.find((t) => t.status === 'cancelled')!;
      const cancelledToken = tickets.find((t) => t.qrPayload.includes('.') && JSON.parse(Buffer.from(t.qrPayload.split('.')[0], 'base64url').toString()).ticketId === remaining.id)!;
      const blocked = await scan(scanner, cancelledToken.qrPayload);
      assert.equal(blocked.status, 409);
      assert.equal((await json<{ error: { code: string } }>(blocked)).error.code, 'TICKET_INACTIVE');

      await waitFor(() => smsFor(booking.id).some((m) => m.template === 'refund_completed'), 'the refund message');
    });

    it('is idempotent and does not touch a payment that was never completed', async () => {
      const { booking, reference } = await paidTickets('I', [1]);
      const send = (id: string) => ctx.sendWebhook({ id, event: 'payment.refunded', status: 'refunded', reference, bookingId: booking.id, amount: booking.amount_xof });
      await send(`r1-${reference}`);
      const replay = await send(`r1-${reference}`);
      assert.deepEqual(await replay.json(), { accepted: true, duplicate: true });
      await send(`r2-${reference}`);
      assert.equal(await ctx.prisma.refund.count({ where: { order: { bookingId: booking.id } } }), 1);

      const company = await createCompany('J');
      const pending = await startedPayment(company.trip.id, [1]);
      const premature = await ctx.sendWebhook({ id: `pre-${pending.reference}`, event: 'payment.refunded', status: 'refunded', reference: pending.reference, bookingId: pending.booking.id, amount: pending.booking.amount_xof });
      assert.equal(premature.status, 200);
      assert.equal((await state(pending.booking.id)).payment, 'pending', 'a refund event for an unpaid booking changes nothing');
    });

    it('flags a partial refund instead of cancelling the tickets', async () => {
      const { booking, reference } = await paidTickets('K', [1, 2]);
      const response = await ctx.sendWebhook({ id: `part-${reference}`, event: 'payment.refunded', status: 'refunded', reference, bookingId: booking.id, amount: Math.floor(booking.amount_xof / 2) });
      assert.equal(response.status, 200);
      assert.deepEqual((await state(booking.id)).tickets, ['active', 'active']);
      assert.equal((await state(booking.id)).payment, 'completed');
      const event = await ctx.prisma.securityEvent.findFirst({ where: { eventType: 'payment.partial_refund_received' }, orderBy: { createdAt: 'desc' } });
      assert.ok(event);
    });

    it('rejects a refund larger than the payment or in another currency', async () => {
      const { booking, reference } = await paidTickets('L', [1]);
      const tooMuch = await ctx.sendWebhook({ id: `big-${reference}`, event: 'payment.refunded', status: 'refunded', reference, bookingId: booking.id, amount: booking.amount_xof + 1 });
      assert.equal(tooMuch.status, 409);
      const wrongCurrency = await ctx.sendWebhook({ id: `eur-${reference}`, event: 'payment.refunded', status: 'refunded', reference, bookingId: booking.id, amount: booking.amount_xof, currency: 'EUR' });
      assert.equal(wrongCurrency.status, 409);
      assert.equal((await state(booking.id)).payment, 'completed');
    });
  });

  describe('notifications', () => {
    it('sends the confirmation after a webhook payment without any ticket secret', async () => {
      const company = await createCompany('M');
      const { booking, reference } = await startedPayment(company.trip.id, [1]);
      await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      await waitFor(() => smsFor(booking.id).length === 1, 'the confirmation message');
      const message = smsFor(booking.id)[0];
      assert.match(message.payload.message, /Réf\. [A-Z0-9]{8}/);
      assert.doesNotMatch(message.payload.message, /TKH-/);
      const [ticket] = await ctx.walletTickets(traveler, booking.id);
      assert.ok(!message.payload.message.includes(ticket.qrPayload));
      const row = await ctx.prisma.notification.findFirstOrThrow({ where: { payload: { path: ['bookingId'], equals: booking.id } } });
      assert.equal(row.status, 'sent');
    });

    it('keeps a message that could not be sent and delivers it on the next run', async () => {
      const { sendPendingNotificationsJob } = await import('../../src/jobs/notifications/send-notifications.job.js');
      const company = await createCompany('N');
      const { booking, reference } = await startedPayment(company.trip.id, [1]);
      ctx.setSmsDown(true);
      await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      const find = () => ctx.prisma.notification.findFirstOrThrow({ where: { payload: { path: ['bookingId'], equals: booking.id } } });
      await waitFor(async () => (await find()).status === 'failed', 'the failed delivery to be recorded');
      assert.equal(smsFor(booking.id).length, 0);

      ctx.setSmsDown(false);
      await sendPendingNotificationsJob();
      const sent = await find();
      assert.equal(sent.status, 'sent');
      assert.ok(sent.attempts >= 2);
      assert.equal(smsFor(booking.id).length, 1);
    });
  });

  describe('scheduled jobs', () => {
    it('lets only one instance run a named job at a time', async () => {
      const { withAdvisoryLock } = await import('../../src/config/database.js');
      const name = `test-${tag}`;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const first = withAdvisoryLock(name, async () => { await gate; return 'first'; });
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(await withAdvisoryLock(name, async () => 'second'), undefined, 'the second instance skips the run');
      release();
      assert.equal(await first, 'first');
      assert.equal(await withAdvisoryLock(name, async () => 'third'), 'third', 'the lock is released afterwards');
    });

    it('releases the lock even when the job throws', async () => {
      const { withAdvisoryLock } = await import('../../src/config/database.js');
      const name = `throwing-${tag}`;
      await assert.rejects(withAdvisoryLock(name, async () => { throw new Error('boom'); }), /boom/);
      assert.equal(await withAdvisoryLock(name, async () => 'again'), 'again');
    });
  });

  describe('settlement lifecycle', () => {
    async function pendingSettlement(suffix: string) {
      const company = await createCompany(suffix);
      const { booking, reference } = await startedPayment(company.trip.id, [1]);
      await ctx.sendWebhook({ reference, bookingId: booking.id, amount: booking.amount_xof });
      const { settlementService } = await import('../../src/modules/settlements/settlement.service.js');
      const results = await settlementService.generate(new Date(Date.now() - 3_600_000), new Date(Date.now() + 3_600_000));
      const mine = results.find((s) => s.providerCode === company.provider.code);
      assert.ok(mine);
      return { settlementService, settlement: mine };
    }
    const codeOf = async (promise: Promise<unknown>) => {
      try { await promise; } catch (error) { return (error as { code?: string }).code; }
      return undefined;
    };

    it('goes pending, approved, paid and records the transfer reference', async () => {
      const { settlementService, settlement } = await pendingSettlement('O');
      assert.equal(await codeOf(settlementService.markPaid(settlement.id, 'WAVE-123')), 'SETTLEMENT_INVALID_TRANSITION', 'cannot pay before approval');
      await settlementService.approve(settlement.id);
      assert.equal(await codeOf(settlementService.approve(settlement.id)), 'SETTLEMENT_INVALID_TRANSITION', 'cannot approve twice');
      assert.equal(await codeOf(settlementService.markPaid(settlement.id, '   ')), 'PAYOUT_REFERENCE_REQUIRED');
      await settlementService.markPaid(settlement.id, 'WAVE-123');
      const paid = await ctx.prisma.settlement.findUniqueOrThrow({ where: { id: settlement.id } });
      assert.equal(paid.status, 'paid');
      assert.equal(paid.payoutReference, 'WAVE-123');
      assert.ok(paid.approvedAt && paid.paidAt);
      assert.equal(await codeOf(settlementService.cancel(settlement.id)), 'SETTLEMENT_INVALID_TRANSITION', 'a paid settlement is final');
      assert.equal(await codeOf(settlementService.approve('does-not-exist')), 'SETTLEMENT_NOT_FOUND');
    });

    it('lets a pending settlement be cancelled, and regeneration does not revive it', async () => {
      const { settlementService, settlement } = await pendingSettlement('P');
      await settlementService.cancel(settlement.id);
      await settlementService.generate(settlement.periodStart, settlement.periodEnd);
      assert.equal((await ctx.prisma.settlement.findUniqueOrThrow({ where: { id: settlement.id } })).status, 'cancelled');
    });

    it('is enforced by the database, not only by the application', async () => {
      const { settlement } = await pendingSettlement('Q');
      await assert.rejects(ctx.prisma.settlement.update({ where: { id: settlement.id }, data: { status: 'paid' } }), 'paid without a date and reference');
      await assert.rejects(ctx.prisma.settlement.update({ where: { id: settlement.id }, data: { status: 'delivered' } }), 'unknown status');
    });
  });
});
