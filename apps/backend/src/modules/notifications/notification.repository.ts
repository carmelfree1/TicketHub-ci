import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CreateNotificationInput } from './notification.types.js';

const db = prisma;
const STALE_DELIVERY_MS = 15 * 60_000;

export const notificationRepository = {
  create(input: CreateNotificationInput) {
    return db.notification.create({ data: { id: randomUUID(), ...input, payload: input.payload as Prisma.InputJsonObject, status: 'queued' } });
  },
  findById(id: string) { return db.notification.findUnique({ where: { id }, include: { user: true } }); },
  pending(limit = 50, now = new Date()) {
    const staleBefore = new Date(now.getTime() - STALE_DELIVERY_MS);
    return db.notification.findMany({
      where: {
        attempts: { lt: 5 },
        OR: [
          { status: { in: ['queued', 'failed'] } },
          { status: 'sending', updatedAt: { lte: staleBefore } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },
  async claim(id: string, now = new Date()) {
    const staleBefore = new Date(now.getTime() - STALE_DELIVERY_MS);
    const result = await db.notification.updateMany({
      where: {
        id,
        attempts: { lt: 5 },
        OR: [
          { status: { in: ['queued', 'failed'] } },
          { status: 'sending', updatedAt: { lte: staleBefore } },
        ],
      },
      data: { status: 'sending', attempts: { increment: 1 }, updatedAt: now },
    });
    return result.count === 1 ? this.findById(id) : null;
  },
  update(id: string, data: { status: 'sent' | 'failed'; sentAt?: Date }) {
    return db.notification.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  },
};
