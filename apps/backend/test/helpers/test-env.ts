export function configureTestEnv(databaseUrl = 'postgresql://tickethub:tickethub@localhost:5432/unused'): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-not-a-production-key';
  process.env.TICKET_SIGNING_SECRET = 'test-only-ticket-secret-that-is-not-a-production-key';
  process.env.GENIUSPAY_WEBHOOK_SECRET = 'test-only-webhook-secret-that-is-not-a-production-key';
  process.env.GENIUSPAY_API_KEY = 'mock-geniuspay-key';
  process.env.GENIUSPAY_API_SECRET = 'mock-geniuspay-secret';
  process.env.GENIUSPAY_API_BASE_URL = 'https://pay.genius.ci/api/v1/merchant';
  process.env.WEB_ORIGIN = 'http://localhost:3000';
  process.env.APP_URL = 'http://localhost:3000';
  process.env.REDIS_URL = '';
  process.env.SMS_PROVIDER_URL = 'https://sms.test/send';
  process.env.SMS_PROVIDER_API_KEY = 'test-sms-key';
  process.env.DATA_ENCRYPTION_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  // Tests hammer the API far beyond human rates; dedicated rate-limit tests lower these explicitly.
  process.env.API_RATE_LIMIT_MAX ??= '100000';
  process.env.AUTH_RATE_LIMIT_MAX ??= '1000';
  process.env.MFA_RATE_LIMIT_MAX ??= '1000';
  process.env.PAYMENT_RATE_LIMIT_MAX ??= '1000';
  process.env.RESERVATION_RATE_LIMIT_MAX ??= '1000';
  process.env.SCAN_RATE_LIMIT_MAX ??= '1000';
}
