import { prisma } from '../../config/database.js';
import { paymentMethodLabel } from '../../integrations/geniuspay/geniuspay.mapper.js';

const db = prisma as any;

function expiryForBooking(booking: any): Date {
  const startsAt = booking.productType === 'transport' ? booking.busTrip?.departAt : booking.event?.startsAt;
  const duration = booking.productType === 'transport' ? 24 : 12;
  return new Date((startsAt?.getTime?.() ?? Date.now()) + duration * 60 * 60 * 1000);
}

function ticketDto(ticket: any) {
  const booking = ticket.booking;
  const event = booking.event;
  const trip = booking.busTrip;
  const departure = booking.productType === 'transport' ? trip?.departAt : event?.startsAt;
  const expiry = expiryForBooking(booking);
  return {
    id: ticket.id,
    ticketCode: ticket.code,
    commandRef: booking.id,
    productType: booking.productType,
    status: ticket.status,
    usedAt: ticket.usedAt?.toISOString() ?? null,
    passengerName: booking.user.fullName,
    passengerPhone: booking.user.phone,
    carrier: trip?.carrier ?? null,
    departCity: trip?.departCity ?? null,
    departStation: trip?.departStation ?? null,
    arrivalCity: trip?.arrivalCity ?? null,
    arrivalStation: trip?.arrivalStation ?? null,
    departureDate: departure?.toISOString() ?? null,
    departureTime: departure?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' }) ?? null,
    eventTitle: event?.title ?? null,
    venue: event?.venue ?? null,
    city: event?.city ?? null,
    category: booking.ticketCategory?.name ?? null,
    seats: booking.productType === 'transport' && booking.seats[ticket.ordinal] !== undefined ? [booking.seats[ticket.ordinal]] : [],
    quantity: booking.quantity,
    price: booking.amountXof / booking.quantity,
    paymentMethod: paymentMethodLabel(booking.payment?.paymentMethod),
    qrPayload: '',
    issuedAt: ticket.createdAt.toISOString(),
    validUntil: expiry.toISOString(),
  };
}

const ticketIncludes = {
  booking: {
    include: {
      user: true,
      payment: true,
      busTrip: true,
      event: true,
      ticketCategory: true,
    },
  },
};

export const ticketRepository = {
  async listUserTickets(userId: string) {
    const tickets = await db.ticket.findMany({
      where: { booking: { userId, status: 'paid' } },
      include: ticketIncludes,
      orderBy: [{ createdAt: 'desc' }, { ordinal: 'asc' }],
    });
    return tickets.map((ticket: any) => ({
      ...ticketDto(ticket),
      qrPayload: '',
    }));
  },

  async listManifest(tripId: string) {
    const tickets = await db.ticket.findMany({
      where: { booking: { busTripId: tripId, status: 'paid' } },
      include: ticketIncludes,
      orderBy: [{ booking: { createdAt: 'asc' } }, { ordinal: 'asc' }],
    });
    return tickets.map((ticket: any) => {
      const dto = ticketDto(ticket);
      return {
        ticketCode: dto.ticketCode,
        status: dto.status,
        usedAt: dto.usedAt,
        bookingId: dto.commandRef,
        price: dto.price,
        seatNumber: dto.seats[0] ?? null,
        name: dto.passengerName,
        phone: dto.passengerPhone,
        paymentMethod: dto.paymentMethod,
      };
    });
  },

  async findForScan(tx: any, ticketId: string) {
    const [locked] = await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${ticketId} FOR UPDATE`;
    if (!locked) return null;
    return tx.ticket.findUnique({ where: { id: ticketId }, include: ticketIncludes });
  },

  async findByCode(code: string) {
    return db.ticket.findUnique({ where: { code }, select: { id: true, bookingId: true } });
  },

  dto: ticketDto,
  includes: ticketIncludes,
};
