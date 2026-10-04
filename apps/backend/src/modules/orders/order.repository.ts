import { randomUUID } from 'node:crypto';
import { prisma, type DbTransaction } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';
import { commissionService } from './commission.service.js';

const db = prisma;

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

  /**
   * Marks the booking's order paid and records what was sold (provider, quantity, unit price, commission) as an
   * immutable snapshot. Safe to call twice: an order that already has its item keeps it.
   */
  async createFromBooking(tx: DbTransaction, booking: { id: string; userId: string; amountXof: number; currency: string }) {
    const order = await tx.order.upsert({
      where: { bookingId: booking.id },
      create: { id: randomUUID(), bookingId: booking.id, userId: booking.userId, amountXof: booking.amountXof, currency: booking.currency, status: 'paid' },
      update: { status: 'paid' },
    });
    if (await tx.orderItem.count({ where: { orderId: order.id } }) > 0) return order;

    const detail = await tx.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { busTrip: true, event: true, ticketCategory: true },
    });
    const providerId = detail.busTrip?.providerId ?? detail.event?.providerId;
    if (!providerId) throw new AppError('La réservation n’est rattachée à aucune société.', 500, 'BOOKING_WITHOUT_PROVIDER');
    const description = detail.busTrip
      ? `${detail.busTrip.carrier} ${detail.busTrip.departCity} - ${detail.busTrip.arrivalCity}`
      : `${detail.event?.title ?? 'Événement'}${detail.ticketCategory ? ` (${detail.ticketCategory.name})` : ''}`;
    const unitPriceXof = Math.floor(detail.amountXof / detail.quantity);
    const commission = await commissionService.resolve(tx, { providerId, productType: detail.productType, lineTotalXof: detail.amountXof });
    await tx.orderItem.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        providerId,
        productType: detail.productType,
        busTripId: detail.busTripId,
        eventId: detail.eventId,
        ticketCategoryId: detail.ticketCategoryId,
        description: description.slice(0, 300),
        quantity: detail.quantity,
        unitPriceXof,
        lineTotalXof: unitPriceXof * detail.quantity,
        commissionBps: commission.bps,
        commissionXof: Math.min(commission.xof, unitPriceXof * detail.quantity),
      },
    });
    return order;
  },
};
