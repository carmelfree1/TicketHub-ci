import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { SecurityEventInput } from './security-event.types.js';

const db = prisma;
export const securityEventRepository = {
  create(input: SecurityEventInput) {
    return db.securityEvent.create({
      data: { id: randomUUID(), userId: input.userId, eventType: input.eventType, ipAddress: input.ipAddress, userAgent: input.userAgent, metadata: (input.metadata ?? {}) as Prisma.InputJsonObject },
    });
  },
};
