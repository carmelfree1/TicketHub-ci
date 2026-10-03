import { notificationQueue } from './notification.queue.js';
import { paymentQueue } from './payment.queue.js';
import { refundQueue } from './refund.queue.js';

export { notificationQueue, paymentQueue, refundQueue };

export async function closeQueues(): Promise<void> {
  await Promise.all([notificationQueue, paymentQueue, refundQueue]
    .filter((queue) => queue !== null)
    .map((queue) => queue!.close()));
}
