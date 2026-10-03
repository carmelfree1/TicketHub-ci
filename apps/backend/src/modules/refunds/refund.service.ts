import { AppError } from '../../core/errors/AppError.js';
import { refundQueue } from '../../queues/refund.queue.js';
import { refundRepository } from './refund.repository.js';

export const refundService = {
  async request(userId: string, input: { bookingId: string; reason: string }) {
    const refund = await refundRepository.request(userId, input.bookingId, input.reason);
    if (refundQueue) {
      try { await refundQueue.add('review-request', { refundId: refund.id }, { jobId: refund.id, attempts: 5, backoff: { type: 'exponential', delay: 1_000 } }); }
      catch { /* The persisted request remains available for the review dashboard. */ }
    }
    return refund;
  },
  async list(userId: string) {
    if (!userId) throw new AppError('Session utilisateur requise.', 401, 'AUTH_REQUIRED');
    return refundRepository.listForUser(userId);
  },
};
