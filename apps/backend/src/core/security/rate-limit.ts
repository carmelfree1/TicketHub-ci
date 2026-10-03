import rateLimit from 'express-rate-limit';
import { appConfig } from '../../config/app.config.js';

export const authRateLimit = rateLimit({
  windowMs: appConfig.authRateLimit.windowMs,
  limit: appConfig.authRateLimit.limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Trop de tentatives. Réessayez dans quelques minutes.' } },
});

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Trop de requêtes. Réessayez dans un instant.' } },
});
