/** Outbound notification records managed by the API; client endpoints are not exposed yet. */
export type NotificationChannel = 'email' | 'sms';
export type NotificationStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  template: string;
  status: NotificationStatus;
  createdAt: string;
  sentAt?: string | null;
}
