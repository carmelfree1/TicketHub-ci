import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { appConfig } from '../../config/app.config.js';

// These limiters keep their counters in process memory. With several API instances, back them with a shared
// store (for example rate-limit-redis on REDIS_URL) so a limit applies across the whole fleet.

const ipKey = (request: Request) => request.ip ?? 'unknown';
const userOrIpKey = (request: Request) => request.authUser?.id ?? ipKey(request);

function limiter(options: { windowMs: number; limit: number; code: string; message: string; key?: (request: Request) => string }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: options.key ?? ipKey,
    message: { error: { code: options.code, message: options.message } },
  });
}

export const authRateLimit = limiter({
  windowMs: appConfig.authRateLimit.windowMs,
  limit: appConfig.authRateLimit.limit,
  code: 'AUTH_RATE_LIMIT',
  message: 'Trop de tentatives. Réessayez dans quelques minutes.',
});

/** Second-factor attempts are cheap to brute force (10^6 codes), so they get a much tighter budget. */
export const mfaRateLimit = limiter({
  windowMs: 5 * 60_000,
  limit: appConfig.rateLimits.mfa,
  code: 'MFA_RATE_LIMIT',
  message: 'Trop de tentatives de vérification. Réessayez dans quelques minutes.',
});

export const apiRateLimit = limiter({
  windowMs: 60_000,
  limit: 300,
  code: 'RATE_LIMIT',
  message: 'Trop de requêtes. Réessayez dans un instant.',
});

export const paymentRateLimit = limiter({
  windowMs: 60_000,
  limit: appConfig.rateLimits.payment,
  code: 'PAYMENT_RATE_LIMIT',
  message: 'Trop de demandes de paiement. Réessayez dans un instant.',
  key: userOrIpKey,
});

export const reservationRateLimit = limiter({
  windowMs: 60_000,
  limit: appConfig.rateLimits.reservation,
  code: 'RESERVATION_RATE_LIMIT',
  message: 'Trop de réservations. Réessayez dans un instant.',
  key: userOrIpKey,
});

export const scanRateLimit = limiter({
  windowMs: 60_000,
  limit: appConfig.rateLimits.scan,
  code: 'SCAN_RATE_LIMIT',
  message: 'Trop de scans. Réessayez dans un instant.',
  key: userOrIpKey,
});

/** Applied before signature verification, so it bounds the cost of unauthenticated forged requests. */
export const webhookRateLimit = limiter({
  windowMs: 60_000,
  limit: 120,
  code: 'WEBHOOK_RATE_LIMIT',
  message: 'Trop de requêtes.',
});
