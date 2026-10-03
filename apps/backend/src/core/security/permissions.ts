import { AppError } from '../errors/AppError.js';
import type { UserRole } from './jwt.js';

export type Permission = 'catalog:read' | 'booking:create' | 'ticket:read:own' | 'partner:scan' | 'partner:manifest' | 'refund:request';

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  traveler: new Set(['catalog:read', 'booking:create', 'ticket:read:own', 'refund:request']),
  partner: new Set(['catalog:read', 'partner:scan', 'partner:manifest']),
};

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!rolePermissions[role].has(permission)) throw new AppError('Accès interdit.', 403, 'FORBIDDEN');
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
