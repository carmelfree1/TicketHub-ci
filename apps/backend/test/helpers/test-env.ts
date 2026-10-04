export function configureTestEnv(databaseUrl = 'postgresql://tickethub:tickethub@localhost:5432/unused'): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-not-a-production-key';
  process.env.TICKET_SIGNING_SECRET = 'test-only-ticket-secret-that-is-not-a-production-key';
  process.env.GENIUSPAY_WEBHOOK_SECRET = 'test-only-webhook-secret-that-is-not-a-production-key';
  process.env.GENIUSPAY_API_KEY = 'mock-geniuspay-key';
  process.env.GENIUSPAY_API_SECRET = 'mock-geniuspay-secret';
  process.env.GENIUSPAY_API_BASE_URL = 'https://pay.genius.ci/api/v1/merchant';
  process.env.PARTNER_INVITE_CODE = 'test-partner-invite-code';
  process.env.WEB_ORIGIN = 'http://localhost:3000';
  process.env.APP_URL = 'http://localhost:3000';
  process.env.REDIS_URL = '';
}
