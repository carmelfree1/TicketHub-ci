import type { Booking } from '../../generated/prisma/client.js';
import { randomUUID } from 'node:crypto';
import { prisma, type DbTransaction } from '../../config/database.js';
import { BusinessError } from '../../core/errors/BusinessError.js';
import type { EventReservationInput, TransportReservationInput } from './reservation.types.js';

const db = prisma;
const HOLD_MINUTES = 10;

type BookingDtoSource = Pick<
  Booking,
  'id' | 'productType' | 'seats' | 'quantity' | 'amountXof' | 'currency' | 'status' | 'holdExpiresAt' | 'createdAt'
>;

function toBookingDto(booking: BookingDtoSource) {
  return {
    id: booking.id,
    product_type: booking.productType,
    seats: booking.seats,
    quantity: booking.quantity,
    amount_xof: booking.amountXof,
    currency: booking.currency,
    status: booking.status,
    hold_expires_at: booking.holdExpiresAt.toISOString(),
    created_at: booking.createdAt.toISOString(),
  };
}

function validateSeats(seats: number[], capacity: number): number[] {
  if (!Array.isArray(seats) || seats.length < 1 || seats.length > 4 ||
    seats.some((seat) => !Number.isSafeInteger(seat) || seat < 1 || seat > capacity) ||
    new Set(seats).size !== seats.length) {
    throw new BusinessError('La sélection doit contenir de 1 à 4 sièges disponibles.', 'INVALID_SEATS', 400);
  }
  return [...seats].sort((a, b) => a - b);
}

export const reservationRepository = {
  async createTransport(userId: string, input: TransportReservationInput) {
    return db.$transaction(async (tx: DbTransaction) => {
      const [trip] = await tx.$queryRaw<Array<{ id: string; priceXof: number; seatCapacity: number; departAt: Date }>>`
        SELECT id, price_xof AS "priceXof", seat_capacity AS "seatCapacity", depart_at AS "departAt"
        FROM bus_trips WHERE id = ${input.tripId} FOR UPDATE`;
      if (!trip || new Date(trip.departAt).getTime() <= Date.now()) {
        throw new BusinessError('Ce départ n’est plus disponible.', 'TRIP_UNAVAILABLE', 404);
      }
      const seats = validateSeats(input.seats, Number(trip.seatCapacity));
      const now = new Date();
      await tx.booking.updateMany({
        where: { busTripId: trip.id, status: 'pending_payment', holdExpiresAt: { lte: now } },
        data: { status: 'expired' },
      });
      const bookings = await tx.booking.findMany({
        where: { busTripId: trip.id, OR: [{ status: 'paid' }, { status: 'pending_payment', holdExpiresAt: { gt: now } }] },
        select: { seats: true },
      });
      const occupied = new Set<number>(bookings.flatMap((booking: { seats: number[] }) => booking.seats));
      const conflict = seats.find((seat) => occupied.has(seat));
      if (conflict !== undefined) throw new BusinessError(`Le siège ${conflict} vient d’être réservé. Choisissez-en un autre.`, 'SEAT_UNAVAILABLE');
      const booking = await tx.booking.create({
        data: {
          id: randomUUID(), userId, productType: 'transport', busTripId: trip.id,
          seats, quantity: seats.length, amountXof: Number(trip.priceXof) * seats.length,
          currency: 'XOF', status: 'pending_payment', holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
          order: { create: { id: randomUUID(), userId, amountXof: Number(trip.priceXof) * seats.length, currency: 'XOF', status: 'pending_payment' } },
        },
        select: { id: true, productType: true, seats: true, quantity: true, amountXof: true, currency: true, status: true, holdExpiresAt: true, createdAt: true },
      });
      return toBookingDto(booking);
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 10_000 });
  },

  async createEvent(userId: string, input: EventReservationInput) {
    return db.$transaction(async (tx: DbTransaction) => {
      const [category] = await tx.$queryRaw<Array<{ id: string; eventId: string; priceXof: number; capacity: number; startsAt: Date; eventStatus: string }>>`
        SELECT c.id, c.event_id AS "eventId", c.price_xof AS "priceXof", c.capacity,
               e.starts_at AS "startsAt", e.status AS "eventStatus"
        FROM event_ticket_categories c JOIN events e ON e.id = c.event_id
        WHERE c.id = ${input.categoryId} AND c.event_id = ${input.eventId}
        FOR UPDATE OF c`;
      if (!category || category.eventStatus !== 'published' || new Date(category.startsAt).getTime() <= Date.now()) {
        throw new BusinessError('Cet événement ou cette catégorie n’est plus disponible.', 'EVENT_UNAVAILABLE', 404);
      }
      if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) {
        throw new BusinessError('La quantité doit être comprise entre 1 et 10.', 'INVALID_QUANTITY', 400);
      }
      const now = new Date();
      await tx.booking.updateMany({
        where: { ticketCategoryId: category.id, status: 'pending_payment', holdExpiresAt: { lte: now } },
        data: { status: 'expired' },
      });
      const aggregate = await tx.booking.aggregate({
        where: { ticketCategoryId: category.id, OR: [{ status: 'paid' }, { status: 'pending_payment', holdExpiresAt: { gt: now } }] },
        _sum: { quantity: true },
      });
      const reserved = Number(aggregate._sum.quantity ?? 0);
      if (reserved + input.quantity > Number(category.capacity)) {
        throw new BusinessError('Il ne reste pas assez de billets dans cette catégorie.', 'EVENT_SOLD_OUT');
      }
      const booking = await tx.booking.create({
        data: {
          id: randomUUID(), userId, productType: 'event', eventId: category.eventId,
          ticketCategoryId: category.id, seats: [], quantity: input.quantity,
          amountXof: Number(category.priceXof) * input.quantity,
          currency: 'XOF', status: 'pending_payment', holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000),
          order: { create: { id: randomUUID(), userId, amountXof: Number(category.priceXof) * input.quantity, currency: 'XOF', status: 'pending_payment' } },
        },
        select: { id: true, productType: true, seats: true, quantity: true, amountXof: true, currency: true, status: true, holdExpiresAt: true, createdAt: true },
      });
      return toBookingDto(booking);
    }, { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 10_000 });
  },
};
