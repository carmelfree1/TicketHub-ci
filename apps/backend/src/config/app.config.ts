import { env } from './env.js';

export const appConfig = {
  name: 'TicketHub CI API',
  apiPrefix: '/api',
  jsonLimit: '64kb',
  webhookLimit: '128kb',
  appUrl: env.APP_URL.replace(/\/$/, ''),
  webOrigin: new URL(env.WEB_ORIGIN).origin,
  cookieName: 'tickethub_session',
  cookieSecure: env.NODE_ENV === 'production',
  sessionTtlSeconds: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  authRateLimit: { windowMs: 15 * 60 * 1000, limit: 12 },
} as const;
