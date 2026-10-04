import assert from 'node:assert/strict';
import { createHmac, randomInt } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import test from 'node:test';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test('traveler can book and pay, then a partner can consume the issued ticket once', { skip: !testDatabaseUrl, timeout: 60_000 }, async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDatabaseUrl!;
  process.env.JWT_SECRET = 'e2e-only-jwt-secret-that-is-not-a-production-key';
  process.env.TICKET_SIGNING_SECRET = 'e2e-only-ticket-secret-that-is-not-a-production-key';
  process.env.GENIUSPAY_WEBHOOK_SECRET = 'e2e-only-webhook-secret-that-is-not-a-production-key';
  process.env.GENIUSPAY_API_KEY = 'mock-geniuspay-key';
  process.env.GENIUSPAY_API_SECRET = 'mock-geniuspay-secret';
  process.env.GENIUSPAY_API_BASE_URL = 'https://pay.genius.ci/api/v1/merchant';
  process.env.WEB_ORIGIN = 'http://localhost:3000';
  process.env.APP_URL = 'http://localhost:3000';
  process.env.REDIS_URL = '';

  const database = await import('../../src/config/database.js');
  const { createApp } = await import('../../src/app.js');
  let httpServer: Server | undefined;
  const originalFetch = globalThis.fetch;
  const providerReference = `e2e-${Date.now()}-${randomInt(1_000_000)}`;

  try {
    await database.connectDatabase();
    httpServer = createServer(createApp());
    await new Promise<void>((resolve, reject) => {
      httpServer!.once('error', reject);
      httpServer!.listen(0, '127.0.0.1', () => resolve());
    });
    const address = httpServer.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith(`${process.env.GENIUSPAY_API_BASE_URL}/payments`)) {
        return new Response(JSON.stringify({ data: { reference: providerReference, checkout_url: 'https://checkout.genius.ci/mock' } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    async function api(path: string, init: RequestInit = {}, cookie?: string): Promise<Response> {
      const headers = new Headers(init.headers);
      if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      if (cookie) headers.set('Cookie', cookie);
      return fetch(`${baseUrl}${path}`, { ...init, headers });
    }

    function sessionCookie(response: Response): string {
      const value = response.headers.get('set-cookie')?.split(';', 1)[0];
      assert.ok(value, 'expected the API to issue an HttpOnly session cookie');
      return value;
    }

    const travelerRegistration = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Voyageur E2E',
        phone: `0${String(randomInt(0, 1_000_000_000)).padStart(9, '0')}`,
        password: 'Test-only-password-482!',
      }),
    });
    assert.equal(travelerRegistration.status, 201, await travelerRegistration.clone().text());
    const travelerCookie = sessionCookie(travelerRegistration);

    const tripsResponse = await api('/api/catalog/trips');
    assert.equal(tripsResponse.status, 200);
    const trips = (await tripsResponse.json() as { data: Array<{ id: string; seatCapacity: number; occupiedSeats: number[] }> }).data;
    const trip = trips.find((candidate) => candidate.seatCapacity > candidate.occupiedSeats.length);
    assert.ok(trip, 'run npm run db:seed on the test database before the e2e suite');
    const occupied = new Set(trip.occupiedSeats);
    const seat = Array.from({ length: trip.seatCapacity }, (_, index) => index + 1).find((number) => !occupied.has(number));
    assert.ok(seat);

    const bookingResponse = await api('/api/bookings/transport', {
      method: 'POST',
      body: JSON.stringify({ tripId: trip.id, seats: [seat] }),
    }, travelerCookie);
    assert.equal(bookingResponse.status, 201, await bookingResponse.clone().text());
    const booking = (await bookingResponse.json() as { data: { id: string; amount_xof: number; status: string } }).data;
    assert.equal(booking.status, 'pending_payment');

    const paymentResponse = await api(`/api/bookings/${encodeURIComponent(booking.id)}/payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod: 'wave' }),
    }, travelerCookie);
    assert.equal(paymentResponse.status, 201, await paymentResponse.clone().text());
    const payment = (await paymentResponse.json() as { data: { checkoutUrl: string; providerReference: string } }).data;
    assert.equal(payment.checkoutUrl, 'https://checkout.genius.ci/mock');
    assert.equal(payment.providerReference, providerReference);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = Buffer.from(JSON.stringify({
      id: `delivery-${providerReference}`,
      event: 'payment.success',
      data: {
        reference: providerReference,
        amount: booking.amount_xof,
        currency: 'XOF',
        status: 'completed',
        metadata: { booking_id: booking.id },
      },
    }));
    const signature = createHmac('sha256', process.env.GENIUSPAY_WEBHOOK_SECRET!)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');
    const webhookHeaders = {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
    };
    const webhook = await api('/api/webhooks/geniuspay', { method: 'POST', headers: webhookHeaders, body: rawBody });
    assert.equal(webhook.status, 200, await webhook.clone().text());
    assert.deepEqual(await webhook.json(), { accepted: true, duplicate: false });

    const replay = await api('/api/webhooks/geniuspay', { method: 'POST', headers: webhookHeaders, body: rawBody });
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { accepted: true, duplicate: true });

    const walletResponse = await api('/api/tickets', {}, travelerCookie);
    assert.equal(walletResponse.status, 200);
    const wallet = (await walletResponse.json() as { data: Array<{ commandRef: string; status: string; qrPayload: string }> }).data;
    const ticket = wallet.find((candidate) => candidate.commandRef === booking.id);
    assert.ok(ticket, 'successful payment should issue a wallet ticket');
    assert.equal(ticket.status, 'active');
    assert.ok(ticket.qrPayload);

    // Partners exist only through an invitation issued by the company that sold the ticket.
    const { createProviderInvite } = await import('../../src/modules/providers/provider-access.js');
    const sold = await database.prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: { busTrip: true } });
    const invite = await createProviderInvite({ providerId: sold.busTrip!.providerId, role: 'scanner', ttlDays: 1 });
    const partnerRegistration = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Partenaire E2E',
        phone: `0${String(randomInt(0, 1_000_000_000)).padStart(9, '0')}`,
        password: 'Test-only-password-482!',
        partnerInviteCode: invite.code,
      }),
    });
    assert.equal(partnerRegistration.status, 201, await partnerRegistration.clone().text());
    const partnerCookie = sessionCookie(partnerRegistration);

    const scan = await api('/api/partner/scans', {
      method: 'POST',
      body: JSON.stringify({ token: ticket.qrPayload }),
    }, partnerCookie);
    assert.equal(scan.status, 200, await scan.clone().text());
    assert.equal((await scan.json() as { data: { status: string } }).data.status, 'used');

    const duplicateScan = await api('/api/partner/scans', {
      method: 'POST',
      body: JSON.stringify({ token: ticket.qrPayload }),
    }, partnerCookie);
    assert.equal(duplicateScan.status, 409);
    assert.equal((await duplicateScan.json() as { error: { code: string } }).error.code, 'TICKET_ALREADY_USED');
  } finally {
    globalThis.fetch = originalFetch;
    if (httpServer?.listening) {
      await new Promise<void>((resolve, reject) => httpServer!.close((error) => error ? reject(error) : resolve()));
    }
    await database.disconnectDatabase();
  }
});
