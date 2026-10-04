import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';
import type { TripQuery } from './trip.types.js';

const db = prisma;
const liveBookingWhere = (now: Date) => ({
  OR: [{ status: 'paid' }, { status: 'pending_payment', holdExpiresAt: { gt: now } }],
});

function localTime(value: Date): string {
  return value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' });
}

type TripRow = Prisma.BusTripGetPayload<{ include: { bookings: { select: { seats: true } } } }>;

function toTrip(trip: TripRow) {
  const occupied = [...new Set<number>((trip.bookings ?? []).flatMap((booking) => booking.seats.map(Number)))].sort((a, b) => a - b);
  return {
    id: trip.id,
    carrier: trip.carrier,
    carrierCode: trip.carrierCode,
    serviceTitle: trip.serviceTitle,
    departTime: localTime(trip.departAt),
    departAt: trip.departAt.toISOString(),
    departStation: trip.departStation,
    departCity: trip.departCity,
    arrivalTime: trip.arrivalTime,
    arrivalStation: trip.arrivalStation,
    arrivalCity: trip.arrivalCity,
    duration: trip.duration,
    price: trip.priceXof,
    availableSeats: Math.max(0, trip.seatCapacity - occupied.length),
    seatCapacity: trip.seatCapacity,
    occupiedSeats: occupied,
    amenities: Array.isArray(trip.amenities) ? trip.amenities : [],
    vehicle: trip.vehicle,
    registration: trip.registration,
  };
}

export const tripRepository = {
  async list(query: TripQuery, now = new Date()) {
    const departAt: { gt: Date; gte?: Date; lt?: Date } = { gt: now };
    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) return [];
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      departAt.gte = start;
      departAt.lt = end;
    }
    const trips = await db.busTrip.findMany({
      where: {
        departAt,
        ...(query.from ? { OR: [
          { departCity: { contains: query.from, mode: 'insensitive' } },
          { departStation: { contains: query.from, mode: 'insensitive' } },
        ] } : {}),
        ...(query.to ? { AND: [
          { OR: [
            { arrivalCity: { contains: query.to, mode: 'insensitive' } },
            { arrivalStation: { contains: query.to, mode: 'insensitive' } },
          ] },
        ] } : {}),
      },
      include: { bookings: { where: liveBookingWhere(now), select: { seats: true } } },
      orderBy: { departAt: 'asc' },
      take: 100,
    });
    return trips.map(toTrip);
  },

  async findForSeats(tripId: string, now = new Date()) {
    const trip = await db.busTrip.findFirst({
      where: { id: tripId, departAt: { gt: now } },
      include: { bookings: { where: liveBookingWhere(now), select: { seats: true } } },
    });
    if (!trip) return null;
    const occupied = new Set<number>((trip.bookings ?? []).flatMap((booking) => booking.seats.map(Number)));
    return {
      tripId: trip.id,
      capacity: trip.seatCapacity,
      seats: Array.from({ length: trip.seatCapacity }, (_, index) => ({
        number: index + 1,
        status: occupied.has(index + 1) ? 'occupied' as const : 'available' as const,
      })),
    };
  },

  async findById(id: string) {
    return db.busTrip.findUnique({ where: { id } });
  },
};
