import type { RequestHandler } from 'express';
import { AppError } from '../core/errors/AppError.js';
import { hasPermission, type Permission } from '../core/security/permissions.js';

export function authorize(permission: Permission): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser || !hasPermission(request.authUser.role, permission)) {
      next(new AppError('Accès interdit.', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}

export function authorizeRole(...roles: Array<'traveler' | 'partner'>): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      next(new AppError('Accès réservé à un rôle autorisé.', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
