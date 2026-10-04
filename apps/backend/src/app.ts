import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { appConfig } from './config/app.config.js';
import { prisma } from './config/database.js';
import { AppError } from './core/errors/AppError.js';
import { errorHandler } from './core/errors/error-handler.js';
import { logger } from './core/logger/logger.js';
import { apiRateLimit } from './core/security/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { authenticate } from './middleware/authenticate.js';
import { paymentWebhookRoutes } from './modules/payments/payment.routes.js';
import { apiRoutes } from './routes/index.js';

function isTrustedOrigin(origin?: string): boolean {
  if (!origin || env.NODE_ENV !== 'production') return true;
  try { return new URL(origin).origin === appConfig.webOrigin; }
  catch { return false; }
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  app.use(requestId);
  // This service only returns JSON, so the strictest CSP applies: nothing may load or frame its responses.
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    hsts: env.NODE_ENV === 'production' ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
  }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    // Account, ticket and payment responses are personal; only the public catalog may be cached.
    if (!request.path.startsWith('/api/catalog')) response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use((request, response, next) => {
    const origin = request.get('origin');
    const trustedOrigin = isTrustedOrigin(origin);
    if (origin && trustedOrigin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      if (!trustedOrigin) {
        next(new AppError('Origine de requête non autorisée.', 403, 'ORIGIN_FORBIDDEN'));
        return;
      }
      response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
      response.status(204).end();
      return;
    }
    next();
  });

  // Verify the raw body before JSON parsing; GeniusPay signs the exact payload bytes.
  app.use(paymentWebhookRoutes);
  app.use('/api', apiRateLimit);
  app.use(express.json({ limit: appConfig.jsonLimit }));

  app.use((request, _response, next) => {
    if (env.NODE_ENV === 'production' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.get('origin');
      if (!isTrustedOrigin(origin)) {
        next(new AppError('Origine de requête non autorisée.', 403, 'ORIGIN_FORBIDDEN'));
        return;
      }
    }
    next();
  });

  app.get('/api/health', async (_request, response, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      logger.error({ err: error }, 'Health check PostgreSQL échoué');
      next(new AppError('Base de données indisponible.', 503, 'DATABASE_UNAVAILABLE'));
    }
  });

  app.use('/api', authenticate, apiRoutes);
  app.use('/api', (_request, _response, next) => next(new AppError('Route API introuvable.', 404, 'ROUTE_NOT_FOUND')));
  app.use(errorHandler);
  return app;
}
