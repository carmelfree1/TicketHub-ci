import { prisma } from '../../config/database.js';
import { logger } from '../../core/logger/logger.js';

const db = prisma as any;

export async function processRefundReviewJob(input: { refundId: string }): Promise<void> {
  const result = await db.refund.updateMany({
    where: { id: input.refundId, status: 'requested' },
    data: { status: 'reviewing', updatedAt: new Date() },
  });
  if (result.count) logger.info({ refundId: input.refundId }, 'Demande de remboursement mise en revue manuelle');
}
