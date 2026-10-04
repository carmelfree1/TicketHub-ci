import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { startE2eContext, type Session } from '../helpers/e2e-context.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/**
 * Many buyers at once against a limited stock. The invariants that matter commercially: never more seats or tickets
 * sold than exist, never the same seat twice, and answers stay fast enough while the database serializes the writers.
 */
describe('overselling under concurrent load', { skip: !testDatabaseUrl, timeout: 300_000 }, () => {
  let ctx: Awaited<ReturnType<typeof startE2eContext>>;
  const tag = randomUUID().slice(0, 8).toUpperCase();
  const buyers: Session[] = [];
  const BUYERS = 100;

  before(async () => {
    ctx = await startE2eContext(testDatabaseUrl!);
    // Registered in batches: hashing passwords is deliberately slow and would otherwise starve the event loop.
    for (let start = 0; start < BUYERS; start += 20) {
      buyers.push(...await Promise.all(Array.from({ length: 20 }, (_, index) => ctx.registerTraveler(`Acheteur ${start + index}`))));
    }
  });

  after(async () => {
    await ctx?.close();
  });

  const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];

  async function timed(request: () => Promise<Response>) {
    const started = performance.now();
    const response = await request();
    return { status: response.status, ms: performance.now() - started, body: await response.text() };
  }

  async function createTrip(suffix: string, capacity: number) {
    const code = `L${tag}${suffix}`;
    const provider = await ctx.prisma.provider.create({ data: { id: `prov-${code}`, code, name: `Société ${code}`, status: 'active' } });
    return ctx.prisma.busTrip.create({
      data: {
        id: `trip-${code}`, providerId: provider.id, carrier: provider.name, carrierCode: code, serviceTitle: 'Charge',
        departAt: new Date(Date.now() + 72 * 60 * 60 * 1000), departStation: 'A', departCity: 'Abidjan', arrivalStation: 'B',
        arrivalCity: `Ville ${code}`, arrivalTime: '12:00', duration: '4h', priceXof: 5_000, seatCapacity: capacity, vehicle: 'Bus', registration: code,
      },
    });
  }

  it('sells a contested seat exactly once', async () => {
    const trip = await createTrip('A', 40);
    const results = await Promise.all(buyers.map((buyer) => timed(() => ctx.reserve(buyer, trip.id, [7]))));
    const statuses = results.map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 201).length, 1, `statuses: ${[...new Set(statuses)].join(',')}`);
    assert.ok(statuses.every((s) => s === 201 || s === 409), `unexpected statuses: ${[...new Set(statuses)].join(',')}`);
    assert.equal(await ctx.prisma.booking.count({ where: { busTripId: trip.id } }), 1);
    console.log(`# contested seat: ${BUYERS} buyers, p50 ${percentile(results.map((r) => r.ms), 0.5).toFixed(0)} ms, p95 ${percentile(results.map((r) => r.ms), 0.95).toFixed(0)} ms`);
  });

  it('never double-books or exceeds capacity when buyers pick random seats', async () => {
    const capacity = 30;
    const trip = await createTrip('B', capacity);
    const picks = buyers.map((buyer) => ({ buyer, seats: [1 + Math.floor(Math.random() * capacity), 1 + Math.floor(Math.random() * capacity)].filter((seat, index, all) => all.indexOf(seat) === index) }));
    const results = await Promise.all(picks.map(({ buyer, seats }) => timed(() => ctx.reserve(buyer, trip.id, seats))));
    const ok = results.filter((r) => r.status === 201);
    assert.ok(results.every((r) => r.status === 201 || r.status === 409), `unexpected statuses: ${[...new Set(results.map((r) => r.status))].join(',')}`);

    const live = await ctx.prisma.booking.findMany({ where: { busTripId: trip.id, status: 'pending_payment' }, select: { seats: true } });
    const seats = live.flatMap((booking) => booking.seats);
    assert.equal(live.length, ok.length, 'every accepted request has exactly one booking');
    assert.equal(new Set(seats).size, seats.length, 'no seat is held by two bookings');
    assert.ok(seats.length <= capacity, `${seats.length} seats held for a ${capacity} seat bus`);
    assert.ok(seats.every((seat) => seat >= 1 && seat <= capacity));
    console.log(`# random seats: ${ok.length} accepted, ${seats.length}/${capacity} seats held, p95 ${percentile(results.map((r) => r.ms), 0.95).toFixed(0)} ms`);
  });

  it('never sells more tickets than an event category holds', async () => {
    const code = `L${tag}E`;
    const provider = await ctx.prisma.provider.create({ data: { id: `prov-${code}`, code, name: `Société ${code}`, status: 'active' } });
    const capacity = 31;
    const event = await ctx.prisma.event.create({
      data: {
        id: `evt-${code}`, providerId: provider.id, title: 'Charge', eventType: 'concert', venue: 'Salle', city: 'Abidjan',
        startsAt: new Date(Date.now() + 96 * 60 * 60 * 1000),
        categories: { create: [{ id: `cat-${code}`, name: 'Standard', priceXof: 2_000, capacity }] },
      },
    });
    const results = await Promise.all(buyers.map((buyer) => timed(() => ctx.api('/api/bookings/event', {
      method: 'POST',
      body: JSON.stringify({ eventId: event.id, categoryId: `cat-${code}`, quantity: 2 }),
    }, buyer))));
    assert.ok(results.every((r) => r.status === 201 || r.status === 409), `unexpected statuses: ${[...new Set(results.map((r) => r.status))].join(',')}`);
    const sold = await ctx.prisma.booking.aggregate({ where: { ticketCategoryId: `cat-${code}`, status: 'pending_payment' }, _sum: { quantity: true } });
    assert.ok((sold._sum.quantity ?? 0) <= capacity, `${sold._sum.quantity} tickets held for ${capacity}`);
    assert.equal(sold._sum.quantity, 30, 'all but the last odd ticket are sold: 15 pairs');
    console.log(`# event category: ${results.filter((r) => r.status === 201).length} pairs sold of ${capacity} tickets, p95 ${percentile(results.map((r) => r.ms), 0.95).toFixed(0)} ms`);
  });

  it('answers catalog reads quickly while writers are busy', async () => {
    const trip = await createTrip('C', 40);
    const writers = buyers.slice(0, 40).map((buyer, index) => ctx.reserve(buyer, trip.id, [index + 1]));
    const readers = Array.from({ length: 80 }, () => timed(() => ctx.api(`/api/catalog/trips?to=${encodeURIComponent(trip.arrivalCity)}`)));
    const [reads] = await Promise.all([Promise.all(readers), Promise.all(writers)]);
    assert.ok(reads.every((r) => r.status === 200));
    const p95 = percentile(reads.map((r) => r.ms), 0.95);
    console.log(`# catalog reads under write load: p95 ${p95.toFixed(0)} ms`);
    assert.ok(p95 < 3_000, `p95 ${p95.toFixed(0)} ms is too slow`);
  });
});
