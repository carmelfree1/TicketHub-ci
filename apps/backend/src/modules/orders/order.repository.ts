import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';

const db = prisma as any;

export const orderRepository = {
  async findBookingForUser(bookingId: string, userId: string) {
    const booking = await db.booking.findFirst({
      where: { id: bookingId, userId },
      include: { payment: true, busTrip: true, event: true, ticketCategory: true },
    });
    if (!booking) return null;
    const status = booking.status === 'pending_payment' && booking.holdExpiresAt.getTime() <= Date.now() ? 'expired' : booking.status;
    return {
      id: booking.id,
      product_type: booking.productType,
      bus_trip_id: booking.busTripId,
      event_id: booking.eventId,
      ticket_category_id: booking.ticketCategoryId,
      seats: booking.seats,
      quantity: booking.quantity,
      amount_xof: booking.amountXof,
      currency: booking.currency,
      status,
      hold_expires_at: booking.holdExpiresAt.toISOString(),
      created_at: booking.createdAt.toISOString(),
      provider_reference: booking.payment?.providerReference ?? null,
      checkout_url: booking.payment?.checkoutUrl ?? null,
      payment_status: booking.payment?.status ?? null,
      carrier: booking.busTrip?.carrier ?? null,
      depart_city: booking.busTrip?.departCity ?? null,
      depart_station: booking.busTrip?.departStation ?? null,
      arrival_city: booking.busTrip?.arrivalCity ?? null,
      arrival_station: booking.busTrip?.arrivalStation ?? null,
      depart_at: booking.busTrip?.departAt?.toISOString() ?? null,
      event_title: booking.event?.title ?? null,
      venue: booking.event?.venue ?? null,
      city: booking.event?.city ?? null,
      starts_at: booking.event?.startsAt?.toISOString() ?? null,
      category_name: booking.ticketCategory?.name ?? null,
    };
  },

  listOrders(userId: string) {
    return db.order.findMany({
      where: { userId },
      include: { booking: { include: { tickets: true, busTrip: true, event: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  createFromBooking(tx: any, booking: { id: string; userId: string; amountXof: number; currency: string }) {
    return tx.order.upsert({
      where: { bookingId: booking.id },
      create: { id: randomUUID(), bookingId: booking.id, userId: booking.userId, amountXof: booking.amountXof, currency: booking.currency, status: 'paid' },
      update: { status: 'paid' },
    });
  },
};
