import assert from 'node:assert/strict';
import { createHmac, randomInt } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { TERMS_VERSION } from '@tickethub/shared';
import { configureTestEnv } from './test-env.js';

export interface Booking {
  id: string;
  amount_xof: number;
  status: string;
  seats: number[];
}

export interface Session {
  cookie: string;
  phone: string;
  password: string;
}

/**
 * Boots the real Express app against TEST_DATABASE_URL and stubs only the outbound GeniusPay
 * checkout creation call. Everything else (auth, locks, transactions, webhooks) is the production code.
 */
export async function startE2eContext(databaseUrl: string) {
  configureTestEnv(databaseUrl);
  const database = await import('../../src/config/database.js');
  const { createApp } = await import('../../src/app.js');
  await database.connectDatabase();

  const httpServer: Server = createServer(createApp());
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  const address = httpServer.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const originalFetch = globalThis.fetch;
  let providerCounter = 0;
  /** What the fake gateway answers to GET /payments/{reference}; absent means 404. */
  const gatewayPayments = new Map<string, { status: string; amount: number; currency: string }>();
  const gatewayFailures = new Set<string>();
  const sms: Array<{ to: string; template: string; payload: { message: string } }> = [];
  let smsDown = false;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const base = `${process.env.GENIUSPAY_API_BASE_URL}/payments`;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.startsWith(base) && (init?.method ?? 'GET') === 'POST') {
      providerCounter += 1;
      const reference = `test-${Date.now()}-${providerCounter}-${randomInt(1_000_000)}`;
      return json({ data: { reference, checkout_url: 'https://checkout.genius.ci/mock' } }, 201);
    }
    if (url.startsWith(`${base}/`)) {
      const reference = decodeURIComponent(url.slice(base.length + 1));
      if (gatewayFailures.has(reference)) return json({ error: { message: 'boom' } }, 500);
      const known = gatewayPayments.get(reference);
      return known ? json({ data: { reference, ...known } }) : json({ error: { message: 'not found' } }, 404);
    }
    if (url === process.env.SMS_PROVIDER_URL) {
      if (smsDown) return json({ error: 'down' }, 503);
      sms.push(JSON.parse(String(init?.body)) as (typeof sms)[number]);
      return json({ ok: true });
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  async function api(path: string, init: RequestInit = {}, session?: Session): Promise<Response> {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (session) headers.set('Cookie', session.cookie);
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  }

  async function register(fullName: string, extra: Record<string, unknown> = {}): Promise<Session> {
    const phone = `0${String(randomInt(0, 1_000_000_000)).padStart(9, '0')}`;
    const password = 'Test-only-password-482!';
    const response = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, phone, password, acceptTerms: true, termsVersion: TERMS_VERSION, ...extra }),
    });
    assert.equal(response.status, 201, await response.clone().text());
    const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
    assert.ok(cookie, 'expected an HttpOnly session cookie');
    return { cookie, phone, password };
  }

  const registerTraveler = (name = 'Voyageur Test') => register(name);
  /** Partner accounts exist only through a company invitation, exactly as in production. */
  async function registerPartnerFor(providerId: string, role: 'owner' | 'manager' | 'scanner' = 'scanner', name = 'Partenaire Test'): Promise<Session> {
    const { createProviderInvite } = await import('../../src/modules/providers/provider-access.js');
    const invite = await createProviderInvite({ providerId, role, ttlDays: 1 });
    return register(name, { partnerInviteCode: invite.code });
  }

  const providerIdByCode = async (code: string) => (await database.prisma.provider.findUniqueOrThrow({ where: { code } })).id;

  /** The company that sold a booking, so a scanner of the right company can be created for it. */
  async function providerOfBooking(bookingId: string): Promise<string> {
    const booking = await database.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { busTrip: true, event: true } });
    return (booking.busTrip?.providerId ?? booking.event?.providerId)!;
  }

  const shuffled = <T,>(items: T[]): T[] => items.map((item) => ({ item, key: Math.random() })).sort((x, y) => x.key - y.key).map(({ item }) => item);

  /**
   * Returns a trip with at least `count` free seats and some of those seats. Both are random because test files
   * run in parallel against one database; always taking the first free seat made them collide.
   */
  async function freeSeats(count: number): Promise<{ tripId: string; seats: number[] }> {
    const response = await api('/api/catalog/trips');
    assert.equal(response.status, 200);
    const trips = (await response.json() as { data: Array<{ id: string; seatCapacity: number; occupiedSeats: number[] }> }).data;
    for (const trip of shuffled(trips)) {
      const occupied = new Set(trip.occupiedSeats);
      const seats = Array.from({ length: trip.seatCapacity }, (_, index) => index + 1).filter((seat) => !occupied.has(seat));
      if (seats.length >= count) return { tripId: trip.id, seats: shuffled(seats).slice(0, count).sort((x, y) => x - y) };
    }
    assert.fail('no trip with enough free seats; run db:seed on the test database');
  }

  function reserve(session: Session, tripId: string, seats: number[]): Promise<Response> {
    return api('/api/bookings/transport', { method: 'POST', body: JSON.stringify({ tripId, seats }) }, session);
  }

  async function reserveOk(session: Session, seatCount = 1): Promise<Booking> {
    // A parallel test file can still take the same random seat; retry with a fresh pick.
    for (let attempt = 0; ; attempt += 1) {
      const { tripId, seats } = await freeSeats(seatCount);
      const response = await reserve(session, tripId, seats);
      if (response.status === 409 && attempt < 4) continue;
      assert.equal(response.status, 201, await response.clone().text());
      return (await response.json() as { data: Booking }).data;
    }
  }

  async function startPayment(session: Session, booking: Booking): Promise<{ providerReference: string }> {
    const response = await api(`/api/bookings/${encodeURIComponent(booking.id)}/payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod: 'wave' }),
    }, session);
    assert.equal(response.status, 201, await response.clone().text());
    return (await response.json() as { data: { providerReference: string } }).data;
  }

  interface WebhookOptions {
    id?: string;
    event?: string;
    reference: string;
    bookingId: string;
    amount: number;
    currency?: string;
    status?: string;
    timestamp?: string;
    secret?: string;
  }

  function webhookRequest(options: WebhookOptions) {
    const timestamp = options.timestamp ?? String(Math.floor(Date.now() / 1000));
    const rawBody = Buffer.from(JSON.stringify({
      id: options.id ?? `delivery-${options.reference}`,
      event: options.event ?? 'payment.success',
      data: {
        reference: options.reference,
        amount: options.amount,
        currency: options.currency ?? 'XOF',
        status: options.status ?? 'completed',
        metadata: { booking_id: options.bookingId },
      },
    }));
    const signature = createHmac('sha256', options.secret ?? process.env.GENIUSPAY_WEBHOOK_SECRET!)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest('hex');
    return { rawBody, headers: { 'Content-Type': 'application/json', 'X-Webhook-Timestamp': timestamp, 'X-Webhook-Signature': signature } };
  }

  function sendWebhook(options: WebhookOptions): Promise<Response> {
    const { rawBody, headers } = webhookRequest(options);
    return api('/api/webhooks/geniuspay', { method: 'POST', headers, body: rawBody });
  }

  async function walletTickets(session: Session, bookingId: string) {
    const response = await api('/api/tickets', {}, session);
    assert.equal(response.status, 200);
    const tickets = (await response.json() as { data: Array<{ commandRef: string; status: string; qrPayload: string }> }).data;
    return tickets.filter((ticket) => ticket.commandRef === bookingId);
  }

  async function close() {
    globalThis.fetch = originalFetch;
    await new Promise<void>((resolve, reject) => httpServer.close((error) => (error ? reject(error) : resolve())));
    await database.disconnectDatabase();
  }

  return {
    prisma: database.prisma,
    gatewayPayments,
    gatewayFailures,
    sms,
    setSmsDown: (down: boolean) => { smsDown = down; },
    api,
    registerTraveler,
    registerPartnerFor,
    providerIdByCode,
    providerOfBooking,
    freeSeats,
    reserve,
    reserveOk,
    startPayment,
    sendWebhook,
    webhookRequest,
    walletTickets,
    close,
  };
}
