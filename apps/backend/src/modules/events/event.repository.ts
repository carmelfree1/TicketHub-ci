import type { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';
import type { EventQuery } from './event.types.js';

const db = prisma;
const bookingWhere = (now: Date) => ({
  OR: [{ status: 'paid' }, { status: 'pending_payment', holdExpiresAt: { gt: now } }],
});

type EventRow = Prisma.EventGetPayload<{
  include: { categories: { include: { bookings: { select: { quantity: true } } } } };
}>;

function toEvent(event: EventRow) {
  return {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    description: event.description,
    venue: event.venue,
    city: event.city,
    startsAt: event.startsAt.toISOString(),
    imageUrl: event.imageUrl,
    categories: (event.categories ?? []).map((category) => {
      const reserved = (category.bookings ?? []).reduce((sum: number, booking) => sum + booking.quantity, 0);
      return {
        id: category.id,
        name: category.name,
        price: category.priceXof,
        capacity: category.capacity,
        available: Math.max(category.capacity - reserved, 0),
      };
    }),
  };
}

const eventInclude = (now: Date) => ({
  categories: { include: { bookings: { where: bookingWhere(now), select: { quantity: true } } } },
});

export const eventRepository = {
  async list(query: EventQuery = {}, now = new Date()) {
    const events = await db.event.findMany({
      where: { status: 'published', startsAt: { gt: now }, ...(query.type ? { eventType: query.type } : {}) },
      include: eventInclude(now),
      orderBy: { startsAt: 'asc' },
      take: 100,
    });
    return events.map(toEvent);
  },

  async findById(id: string, now = new Date()) {
    const event = await db.event.findFirst({
      where: { id, status: 'published', startsAt: { gt: now } },
      include: eventInclude(now),
    });
    return event ? toEvent(event) : null;
  },
};
