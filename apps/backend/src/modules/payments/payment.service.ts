import { appConfig } from '../../config/app.config.js';
import { verifyGeniusPayWebhook, parseGeniusPayWebhook } from '../../integrations/geniuspay/geniuspay.webhook.js';
import { geniusPayAdapter } from '../../integrations/geniuspay/geniuspay.adapter.js';
import { paymentQueue } from '../../queues/payment.queue.js';
import { paymentRepository } from './payment.repository.js';
import type { PaymentMethodId } from './payment.types.js';

export const paymentService = {
  async start(userId: string, bookingId: string, paymentMethod: PaymentMethodId) {
    const payment = await paymentRepository.start(userId, bookingId, paymentMethod, (input) => geniusPayAdapter.createPayment({ ...input, appUrl: appConfig.appUrl }));
    if (paymentQueue) {
      try {
        await paymentQueue.add('reconcile', { bookingId }, {
          jobId: `reconcile-${bookingId}`,
          delay: 30 * 60_000,
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: true,
        });
      } catch {
        // Periodic reconciliation is the durable fallback when the queue is unavailable.
      }
    }
    return payment;
  },

  async handleWebhook(input: { signature: string; timestamp: string; deliveryId?: string; rawBody: Buffer }) {
    verifyGeniusPayWebhook(input);
    const payload = parseGeniusPayWebhook(input.rawBody);
    // The signed payload id is the idempotency key; an unsigned delivery header is not trusted.
    return paymentRepository.processWebhook(payload.id, payload.event, payload);
  },
};
