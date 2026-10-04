import '../src/load-env.js';
import { prisma, postgresPool } from '../src/config/database.js';
import { DEMO_EVENTS, DEMO_TRIPS } from './demo-data.js';

const db = prisma;

function dateInDays(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const DEMO_ORGANIZER_CODE = 'DEMO-EVENTS';

async function seed(): Promise<void> {
  await db.provider.upsert({
    where: { code: DEMO_ORGANIZER_CODE },
    create: { id: DEMO_ORGANIZER_CODE, code: DEMO_ORGANIZER_CODE, name: 'Organisateur de démonstration', status: 'active' },
    update: {},
  });
  for (const provider of new Map(DEMO_TRIPS.map((trip) => [trip.carrierCode, { code: trip.carrierCode, name: trip.carrier }])).values()) {
    await db.provider.upsert({
      where: { code: provider.code },
      create: { id: provider.code, code: provider.code, name: provider.name, status: 'active' },
      update: { name: provider.name, status: 'active' },
    });
  }

  const providerIds = new Map((await db.provider.findMany({ select: { id: true, code: true } })).map((provider) => [provider.code, provider.id]));
  const providerIdFor = (code: string): string => {
    const id = providerIds.get(code);
    if (!id) throw new Error(`Unknown provider ${code}`);
    return id;
  };

  for (let offset = 1; offset <= 14; offset += 1) {
    const day = dateInDays(offset);
    const dateId = day.toISOString().slice(0, 10).replaceAll('-', '');
    for (const trip of DEMO_TRIPS) {
      const [hour, minute] = trip.departTime.split(':').map(Number);
      const departAt = new Date(day);
      departAt.setUTCHours(hour, minute, 0, 0);
      const id = `${trip.id}-${dateId}`;
      await db.busTrip.upsert({
        where: { id },
        create: {
          id, providerId: providerIdFor(trip.carrierCode), carrier: trip.carrier, carrierCode: trip.carrierCode, serviceTitle: trip.serviceTitle,
          departAt, departStation: trip.departStation, departCity: trip.departCity,
          arrivalStation: trip.arrivalStation, arrivalCity: trip.arrivalCity, arrivalTime: trip.arrivalTime,
          duration: trip.duration, priceXof: trip.price, seatCapacity: 41,
          amenities: trip.amenities, vehicle: trip.vehicle, registration: trip.registration,
        },
        update: {},
      });
    }
  }

  for (const event of DEMO_EVENTS) {
    await db.event.upsert({
      where: { id: event.id },
      create: {
        id: event.id, providerId: providerIdFor(DEMO_ORGANIZER_CODE), title: event.title, eventType: event.eventType, description: event.description,
        venue: event.venue, city: event.city, startsAt: new Date(event.startsAt), imageUrl: event.imageUrl,
      },
      update: {},
    });
    for (const category of event.categories) {
      await db.eventTicketCategory.upsert({
        where: { id: category.id },
        create: { id: category.id, eventId: event.id, name: category.name, priceXof: category.price, capacity: category.capacity },
        update: {},
      });
    }
  }
}

async function main(): Promise<void> {
  try {
    await seed();
  } catch (error) {
    console.error('[prisma seed]', error);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); }
    finally { await postgresPool.end(); }
  }
}

void main();
