import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { prisma, type DbTransaction } from '../../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { logger } from '../../core/logger/logger.js';

export interface AuditEntry {
  action: string;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function requestContext(request: Request): Pick<AuditEntry, 'userId' | 'ipAddress' | 'userAgent'> {
  // Keys are omitted (not set to undefined) so spreading the context never overwrites an explicit userId.
  return {
    ...(request.authUser ? { userId: request.authUser.id } : {}),
    ipAddress: request.ip?.slice(0, 64),
    userAgent: request.get('user-agent')?.slice(0, 500),
  };
}

function toRow(entry: AuditEntry) {
  return {
    id: randomUUID(),
    userId: entry.userId ?? null,
    action: entry.action,
    resourceType: entry.resourceType ?? null,
    resourceId: entry.resourceId ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    metadata: (entry.metadata ?? {}) as Prisma.InputJsonObject,
  };
}

export const auditService = {
  /** Best effort: an audit write failure is logged but never breaks the business operation. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({ data: toRow(entry) });
    } catch (error) {
      logger.warn({ err: error, action: entry.action }, 'Entrée d’audit non persistée');
    }
  },

  /** Use inside a transaction when the audit trail must commit atomically with the change itself. */
  async recordIn(tx: DbTransaction, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({ data: toRow(entry) });
  },
};
