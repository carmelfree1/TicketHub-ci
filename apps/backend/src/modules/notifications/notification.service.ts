import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { notificationQueue } from '../../queues/notification.queue.js';
import { emailService } from '../../integrations/email/email.service.js';
import { smsService } from '../../integrations/sms/sms.service.js';
import { notificationRepository } from './notification.repository.js';
import type { CreateNotificationInput } from './notification.types.js';

export const notificationService = {
  async enqueue(input: CreateNotificationInput) {
    const notification = await notificationRepository.create(input);
    if (notificationQueue) {
      try {
        await notificationQueue.add('deliver', { notificationId: notification.id }, {
          jobId: notification.id, attempts: 5, backoff: { type: 'exponential', delay: 1_000 },
        });
      } catch {
        // The persisted notification remains discoverable by the scheduled job.
      }
    }
    return notification;
  },

  /**
   * Hands notifications that were committed with a business change to the queue, or sends them directly when there is
   * no queue. Never throws and never blocks the caller: a failure leaves the row for the scheduled retry job.
   */
  dispatch(ids: string[]): void {
    for (const id of ids) {
      void (async () => {
        try {
          if (notificationQueue) {
            await notificationQueue.add('deliver', { notificationId: id }, { jobId: id, attempts: 5, backoff: { type: 'exponential', delay: 1_000 } });
          } else {
            await notificationService.deliver(id);
          }
        } catch (error) {
          logger.warn({ err: error, notificationId: id }, 'Notification non envoyée immédiatement; nouvelle tentative planifiée');
        }
      })();
    }
  },

  async deliver(notificationId: string) {
    const notification = await notificationRepository.claim(notificationId);
    if (!notification) return;
    try {
      const payload = notification.payload as Record<string, unknown>;
      const to = typeof payload.to === 'string' ? payload.to : notification.user?.phone;
      if (!to) throw new AppError('Destinataire de notification manquant.', 400, 'NOTIFICATION_RECIPIENT_REQUIRED');
      const input = { to, template: notification.template, payload };
      if (notification.channel === 'email') await emailService.send(input);
      else if (notification.channel === 'sms') await smsService.send(input);
      else throw new AppError('Canal de notification non pris en charge.', 400, 'INVALID_NOTIFICATION_CHANNEL');
      await notificationRepository.update(notificationId, { status: 'sent', sentAt: new Date() });
    } catch (error) {
      await notificationRepository.update(notificationId, { status: 'failed' });
      throw error;
    }
  },
};
