export type NotificationChannel = 'email' | 'sms';

export interface CreateNotificationInput {
  userId?: string;
  channel: NotificationChannel;
  template: string;
  payload: Record<string, unknown>;
}
