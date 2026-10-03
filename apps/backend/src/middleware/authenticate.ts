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
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const item of header.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return parts.join('=');
  }
  return undefined;
}

function extractToken(request: Request): string | undefined {
  const authorization = request.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  return readCookie(request.get('cookie'), appConfig.cookieName);
}

export const authenticate: RequestHandler = (request, _response, next) => {
  const token = extractToken(request);
  if (!token) { next(); return; }
  try {
    const claims = verifyJwt(token);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    void (prisma as any).session.findUnique({ where: { tokenHash }, include: { user: true } })
      .then((session: any) => {
        if (!session || session.expiresAt.getTime() <= Date.now() || session.userId !== claims.sub) {
          // Treat stale/revoked credentials as anonymous on public routes (notably login).
          next();
          return;
        }
        request.authUser = {
          id: session.user.id,
          fullName: session.user.fullName,
          phone: session.user.phone,
          role: session.user.role as AuthenticatedUser['role'],
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
