import type { Request, RequestHandler } from 'express';
import { appConfig } from '../config/app.config.js';
import { AppError } from '../core/errors/AppError.js';
import { hasPermission, type Permission } from '../core/security/permissions.js';

/** Roles listed in MFA_REQUIRED_ROLES cannot use privileged routes until they have enrolled a second factor. */
function mfaSatisfied(user: NonNullable<Request['authUser']>): boolean {
  return !appConfig.mfaRequiredRoles.has(user.role) || user.mfaEnabled;
}

const mfaSetupRequired = () => new AppError('Activez la double authentification pour accéder à cette fonction.', 403, 'MFA_SETUP_REQUIRED');

export function authorize(permission: Permission): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser || !hasPermission(request.authUser.role, permission)) {
      next(new AppError('Accès interdit.', 403, 'FORBIDDEN'));
      return;
    }
    if (!mfaSatisfied(request.authUser)) {
      next(mfaSetupRequired());
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
    if (!mfaSatisfied(request.authUser)) {
      next(mfaSetupRequired());
      return;
    }
    next();
  };
}
