import { env } from './env.js';

const mfaRequiredRoles = new Set(
  (env.MFA_REQUIRED_ROLES ?? (env.NODE_ENV === 'production' ? 'partner' : '')).split(',').map((role) => role.trim()).filter(Boolean),
);

export const appConfig = {
  name: 'TicketHub CI API',
  apiPrefix: '/api',
  jsonLimit: '64kb',
  webhookLimit: '128kb',
  appUrl: env.APP_URL.replace(/\/$/, ''),
  webOrigin: new URL(env.WEB_ORIGIN).origin,
  // One cookie per kind of account, so a customer and a partner can be signed in at the same time in one browser.
  cookieNames: { traveler: 'tickethub_session', partner: 'tickethub_partner_session' },
  cookieSecure: env.NODE_ENV === 'production',
  sessionTtlSeconds: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  authRateLimit: { windowMs: 15 * 60 * 1000, limit: env.AUTH_RATE_LIMIT_MAX },
  rateLimits: {
    api: env.API_RATE_LIMIT_MAX,
    mfa: env.MFA_RATE_LIMIT_MAX,
    payment: env.PAYMENT_RATE_LIMIT_MAX,
    reservation: env.RESERVATION_RATE_LIMIT_MAX,
    scan: env.SCAN_RATE_LIMIT_MAX,
  },
  mfaRequiredRoles,
  lockout: { maxFailures: 5, durationMs: 15 * 60 * 1000 },
} as const;
