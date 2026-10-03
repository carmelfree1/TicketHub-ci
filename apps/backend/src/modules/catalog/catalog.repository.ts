import { prisma } from '../../config/database.js';
const db = prisma as any;

export const catalogRepository = {
  async summary(now = new Date()) {
    const [upcomingTrips, upcomingEvents] = await Promise.all([
      db.busTrip.count({ where: { departAt: { gt: now } } }),
      db.event.count({ where: { startsAt: { gt: now }, status: 'published' } }),
    ]);
    return { upcomingTrips, upcomingEvents };
  },
};
