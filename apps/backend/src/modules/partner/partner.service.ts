import { prisma } from '../../config/database.js';
import { providerAccess } from '../providers/provider-access.js';

export type StatsPeriod = 'today' | 'week' | 'month';

/** Abidjan is on UTC+0 all year, so UTC day boundaries are local day boundaries. */
export function periodStart(period: StatsPeriod, now = new Date()): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'week') start.setUTCDate(start.getUTCDate() - 6);
  if (period === 'month') start.setUTCDate(1);
  return start;
}

export const partnerService = {
  async me(userId: string) {
    const memberships = await providerAccess.membershipsOf(userId);
    return { providers: memberships.map((m) => ({ id: m.providerId, code: m.providerCode, name: m.providerName, role: m.role })) };
  },

  /** Departures of the partner's companies, from yesterday onwards, with how many seats are sold. */
  async trips(userId: string) {
    const providerIds = (await providerAccess.requireMemberships(userId)).map((m) => m.providerId);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trips = await prisma.busTrip.findMany({
      where: { providerId: { in: providerIds }, departAt: { gte: since } },
      orderBy: { departAt: 'asc' },
      take: 60,
    });
    const sold = await prisma.booking.groupBy({
      by: ['busTripId'],
      where: { busTripId: { in: trips.map((trip) => trip.id) }, status: 'paid' },
      _sum: { quantity: true },
    });
    const soldByTrip = new Map(sold.map((row) => [row.busTripId, row._sum.quantity ?? 0]));
    return trips.map((trip) => ({
      id: trip.id,
      carrier: trip.carrier,
      departAt: trip.departAt.toISOString(),
      departCity: trip.departCity,
      departStation: trip.departStation,
      arrivalCity: trip.arrivalCity,
      arrivalStation: trip.arrivalStation,
      seatCapacity: trip.seatCapacity,
      seatsSold: soldByTrip.get(trip.id) ?? 0,
    }));
  },

  async stats(userId: string, period: StatsPeriod) {
    const memberships = await providerAccess.requireMemberships(userId);
    const providerIds = memberships.map((m) => m.providerId);
    const since = periodStart(period);
    const items = await prisma.orderItem.aggregate({
      where: { providerId: { in: providerIds }, createdAt: { gte: since }, order: { status: 'paid' } },
      _sum: { lineTotalXof: true, commissionXof: true, quantity: true },
      _count: { _all: true },
    });
    const scanned = await prisma.ticket.count({
      where: {
        status: 'used',
        usedAt: { gte: since },
        booking: { OR: [{ busTrip: { providerId: { in: providerIds } } }, { event: { providerId: { in: providerIds } } }] },
      },
    });
    const grossXof = items._sum.lineTotalXof ?? 0;
    const commissionXof = items._sum.commissionXof ?? 0;
    return {
      period,
      since: since.toISOString(),
      grossXof,
      commissionXof,
      netXof: grossXof - commissionXof,
      ticketsSold: items._sum.quantity ?? 0,
      orders: items._count._all,
      ticketsScanned: scanned,
    };
  },
};
