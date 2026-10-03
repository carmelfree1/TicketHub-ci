export interface SecurityEventInput {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
