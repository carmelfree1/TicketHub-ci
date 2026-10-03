import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';
import { BusinessError } from '../../core/errors/BusinessError.js';

const db = prisma as any;

export const refundRepository = {
  async request(userId: string, bookingId: string, reason: string) {
    return db.$transaction(async (tx: any) => {
      const order = await tx.order.findFirst({ where: { bookingId, userId, status: 'paid' } });
      if (!order) throw new AppError('Commande payée introuvable.', 404, 'ORDER_NOT_FOUND');
      const existing = await tx.refund.findUnique({ where: { orderId: order.id } });
      if (existing) throw new BusinessError('Une demande de remboursement existe déjà pour cette commande.', 'REFUND_ALREADY_REQUESTED');
      return tx.refund.create({
        data: { id: randomUUID(), orderId: order.id, userId, reason, status: 'requested' },
        select: { id: true, orderId: true, reason: true, status: true, createdAt: true },
      });
    }, { isolationLevel: 'Serializable' });
  },
  listForUser(userId: string) {
    return db.refund.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  },
};
