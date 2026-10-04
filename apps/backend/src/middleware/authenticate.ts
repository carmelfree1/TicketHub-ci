import { createHash } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../core/errors/AppError.js';
import { verifyJwt } from '../core/security/jwt.js';
import { appConfig } from '../config/app.config.js';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  phone: string;
  role: 'traveler' | 'partner';
  mfaEnabled: boolean;
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const item of header.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return parts.join('=');
  }
  return undefined;
}

export type Account = 'traveler' | 'partner';

/**
 * Which session a request acts as. The browser keeps one cookie per kind of account. The web app says which one it
 * means with `X-Account` on the shared authentication routes; partner endpoints always mean the partner account.
 */
export function accountFor(request: Request): Account {
  const header = request.get('x-account');
  if (header === 'partner' || header === 'traveler') return header;
  return request.originalUrl.startsWith('/api/partner') ? 'partner' : 'traveler';
}

function extractToken(request: Request, account: Account): string | undefined {
  const authorization = request.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  const cookies = request.get('cookie');
  const own = readCookie(cookies, appConfig.cookieNames[account]);
  // On partner endpoints a customer session is still read, so a customer is told "forbidden" rather than "sign in".
  if (!own && account === 'partner' && !request.get('x-account')) return readCookie(cookies, appConfig.cookieNames.traveler);
  return own;
}

export const authenticate: RequestHandler = (request, _response, next) => {
  const account = accountFor(request);
  request.account = account;
  const token = extractToken(request, account);
  if (!token) { next(); return; }
  try {
    const claims = verifyJwt(token);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    void prisma.session.findUnique({ where: { tokenHash }, include: { user: true } })
      .then((session) => {
        // A partner session presented as the customer account (or the reverse) is not valid for that account.
        const roleMismatch = session !== null && account === 'traveler' && session.user.role !== 'traveler';
        if (!session || roleMismatch || session.expiresAt.getTime() <= Date.now() || session.userId !== claims.sub) {
          // Treat stale/revoked credentials as anonymous on public routes (notably login).
          next();
          return;
        }
        request.authUser = {
          id: session.user.id,
          fullName: session.user.fullName,
          phone: session.user.phone,
          role: session.user.role as AuthenticatedUser['role'],
          mfaEnabled: session.user.mfaEnabledAt !== null,
        };
        request.sessionToken = token;
        request.sessionTokenHash = tokenHash;
        next();
      })
      .catch((error: unknown) => next(error));
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      next();
      return;
    }
    next(error);
  }
};

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  if (!request.authUser) {
    next(new AppError('Connectez-vous pour continuer.', 401, 'AUTH_REQUIRED'));
    return;
  }
  next();
}
