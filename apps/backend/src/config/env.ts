import { z } from 'zod';

const optionalUrl = z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional());
const optionalSecret = z.preprocess((value) => value === '' ? undefined : value, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL PostgreSQL valide.'),
  REDIS_URL: optionalUrl,
  APP_URL: z.string().url().default('http://localhost:3000'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit contenir au moins 32 caractères.'),
  TICKET_SIGNING_SECRET: z.string().min(32, 'TICKET_SIGNING_SECRET doit contenir au moins 32 caractères.'),
  DATA_ENCRYPTION_KEY: optionalSecret,
  GENIUSPAY_API_KEY: optionalSecret,
  GENIUSPAY_API_SECRET: optionalSecret,
  GENIUSPAY_WEBHOOK_SECRET: optionalSecret,
  GENIUSPAY_API_BASE_URL: z.string().url().default('https://pay.genius.ci/api/v1/merchant'),
  EMAIL_PROVIDER_URL: optionalUrl,
  EMAIL_PROVIDER_API_KEY: optionalSecret,
  SMS_PROVIDER_URL: optionalUrl,
  SMS_PROVIDER_API_KEY: optionalSecret,
  PGSSL: z.preprocess((value) => value === 'true', z.boolean().default(false)),
  PG_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  PLATFORM_COMMISSION_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MFA_REQUIRED_ROLES: z.string().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(12),
  MFA_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  PAYMENT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  RESERVATION_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  SCAN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(14),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === 'production') {
    if (!value.REDIS_URL) ctx.addIssue({ code: 'custom', path: ['REDIS_URL'], message: 'REDIS_URL est obligatoire en production.' });
    for (const name of ['GENIUSPAY_API_KEY', 'GENIUSPAY_API_SECRET', 'GENIUSPAY_WEBHOOK_SECRET'] as const) {
      if (!value[name]) ctx.addIssue({ code: 'custom', path: [name], message: `${name} est obligatoire en production.` });
    }
    if (!value.APP_URL.startsWith('https://') || !value.WEB_ORIGIN.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['APP_URL'], message: 'APP_URL et WEB_ORIGIN doivent utiliser HTTPS en production.' });
    }
  }
  const mfaRoles = (value.MFA_REQUIRED_ROLES ?? (value.NODE_ENV === 'production' ? 'partner' : '')).split(',').map((role) => role.trim()).filter(Boolean);
  if (mfaRoles.length > 0 && value.NODE_ENV === 'production' && !value.DATA_ENCRYPTION_KEY) {
    ctx.addIssue({ code: 'custom', path: ['DATA_ENCRYPTION_KEY'], message: 'DATA_ENCRYPTION_KEY est obligatoire lorsque la MFA est exigée.' });
  }
  if (value.DATA_ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(value.DATA_ENCRYPTION_KEY)) {
    ctx.addIssue({ code: 'custom', path: ['DATA_ENCRYPTION_KEY'], message: 'DATA_ENCRYPTION_KEY doit contenir 32 octets encodés en hexadécimal.' });
  }
});

export const env = envSchema.parse(process.env);
export type AppEnv = typeof env;
