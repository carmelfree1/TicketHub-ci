import { createHash, randomBytes } from 'node:crypto';
import { appConfig } from '../../config/app.config.js';
import { AppError } from '../../core/errors/AppError.js';
import { decryptSensitiveValue, encryptSensitiveValue } from '../../core/security/encryption.js';
import { signMfaChallenge, verifyMfaChallenge } from '../../core/security/mfa-challenge.js';
import { verifyPassword } from '../../core/security/password.js';
import { generateTotpSecret, otpauthUri, verifyTotp } from '../../core/security/totp.js';
import { auditService, type AuditEntry } from '../audit/audit.service.js';
import { securityEventService } from '../security/security-event.service.js';
import { mfaRepository } from './mfa.repository.js';

type Context = Pick<AuditEntry, 'ipAddress' | 'userAgent'>;

const BACKUP_CODE_COUNT = 10;
const hashBackupCode = (code: string) => createHash('sha256').update(normalizeBackupCode(code)).digest('hex');
const normalizeBackupCode = (code: string) => code.replace(/[\s-]/g, '').toLowerCase();

function newBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = randomBytes(5).toString('hex');
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function isMfaRequiredFor(role: string): boolean {
  return appConfig.mfaRequiredRoles.has(role);
}

export const mfaService = {
  issueChallenge: signMfaChallenge,
  challengeUser: (token: string) => verifyMfaChallenge(token).userId,

  async setup(userId: string, accountName: string) {
    const user = await mfaRepository.findUser(userId);
    if (!user) throw new AppError('Compte introuvable.', 404, 'USER_NOT_FOUND');
    if (user.mfaEnabledAt) throw new AppError('La double authentification est déjà active.', 409, 'MFA_ALREADY_ENABLED');
    const secret = generateTotpSecret();
    await mfaRepository.storePendingSecret(userId, encryptSensitiveValue(secret));
    return { secret, otpauthUri: otpauthUri({ secret, accountName, issuer: 'TicketHub CI' }) };
  },

  async enable(userId: string, code: string, context: Context) {
    const user = await mfaRepository.findUser(userId);
    if (!user?.mfaSecret) throw new AppError('Démarrez d’abord la configuration.', 409, 'MFA_SETUP_NOT_STARTED');
    if (user.mfaEnabledAt) throw new AppError('La double authentification est déjà active.', 409, 'MFA_ALREADY_ENABLED');
    const step = verifyTotp(decryptSensitiveValue(user.mfaSecret), code);
    if (step === null) throw new AppError('Code invalide.', 400, 'MFA_CODE_INVALID');
    const backupCodes = newBackupCodes();
    await mfaRepository.enable(userId, step, backupCodes.map(hashBackupCode));
    await auditService.record({ action: 'mfa.enabled', userId, resourceType: 'user', resourceId: userId, ...context });
    return { backupCodes };
  },

  /** Verifies a TOTP code or a single-use backup code. Returns false (never throws) on a wrong code. */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await mfaRepository.findUser(userId);
    if (!user?.mfaSecret || !user.mfaEnabledAt) return false;
    const trimmed = code.trim();
    if (/^\d{6}$/.test(trimmed)) {
      const step = verifyTotp(decryptSensitiveValue(user.mfaSecret), trimmed);
      return step !== null && (await mfaRepository.consumeStep(userId, step));
    }
    return mfaRepository.consumeBackupCode(userId, hashBackupCode(trimmed));
  },

  async disable(userId: string, password: string, code: string, context: Context) {
    const user = await mfaRepository.findUser(userId);
    if (!user?.mfaEnabledAt) throw new AppError('La double authentification n’est pas active.', 409, 'MFA_NOT_ENABLED');
    if (isMfaRequiredFor(user.role)) throw new AppError('La double authentification est obligatoire pour ce type de compte.', 403, 'MFA_REQUIRED_FOR_ROLE');
    if (!(await verifyPassword(password, user.passwordHash)) || !(await mfaService.verifyCode(userId, code))) {
      await securityEventService.record({ userId, eventType: 'mfa.disable_failed', ...context });
      throw new AppError('Mot de passe ou code incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    await mfaRepository.disable(userId);
    await auditService.record({ action: 'mfa.disabled', userId, resourceType: 'user', resourceId: userId, ...context });
  },

  remainingBackupCodes: mfaRepository.remainingBackupCodes,
};
