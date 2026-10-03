import { notificationRepository } from '../../modules/notifications/notification.repository.js';
import { notificationService } from '../../modules/notifications/notification.service.js';

export async function sendNotificationJob(input: { notificationId: string }): Promise<void> {
  await notificationService.deliver(input.notificationId);
}

export async function sendPendingNotificationsJob(): Promise<number> {
  const pending = await notificationRepository.pending(25);
  let processed = 0;
  for (const notification of pending) {
    try {
      await notificationService.deliver(notification.id);
      processed += 1;
    } catch {
      // Provider outages are persisted and retried by the periodic job/queue.
    }
  }
  return processed;
}
