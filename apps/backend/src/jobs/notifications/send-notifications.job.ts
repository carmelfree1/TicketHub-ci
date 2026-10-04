import { notificationRepository } from '../../modules/notifications/notification.repository.js';
import { notificationService } from '../../modules/notifications/notification.service.js';

export async function sendNotificationJob(input: { notificationId: string }): Promise<void> {
  await notificationService.deliver(input.notificationId);
}

const BATCH_SIZE = 25;
const MAX_PER_RUN = 500;

/**
 * Retries messages that could not be sent. It keeps going batch after batch (bounded) so that a backlog of old failures
 * cannot hide newer messages behind the first few rows. Messages that fail again stay in the table for the next run, up
 * to five attempts each, so every batch is taken from rows not yet seen in this run.
 */
export async function sendPendingNotificationsJob(): Promise<number> {
  let sent = 0;
  const seen = new Set<string>();
  while (seen.size < MAX_PER_RUN) {
    const batch = (await notificationRepository.pending(BATCH_SIZE + seen.size)).filter((notification) => !seen.has(notification.id)).slice(0, BATCH_SIZE);
    if (batch.length === 0) break;
    for (const notification of batch) {
      seen.add(notification.id);
      try {
        await notificationService.deliver(notification.id);
        sent += 1;
      } catch {
        // Provider outages are persisted and retried by the next run.
      }
    }
  }
  return sent;
}
