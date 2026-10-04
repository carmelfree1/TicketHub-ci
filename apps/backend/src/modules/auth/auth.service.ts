import { createHash, randomUUID } from 'node:crypto';
import { normalizeCiPhone as normalizeIvorianPhone } from '@tickethub/shared';
import { appConfig } from '../../config/app.config.js';
import { AppError } from '../../core/errors/AppError.js';
import { signJwt } from '../../core/security/jwt.js';
import { hashPassword, verifyPassword } from '../../core/security/password.js';
import { logger } from '../../core/logger/logger.js';
import { auditService, type AuditEntry } from '../audit/audit.service.js';
import { hashInviteCode } from '../providers/provider-access.js';
import { securityEventService } from '../security/security-event.service.js';
import { authRepository } from './auth.repository.js';
import { mfaRepository } from './mfa.repository.js';
import { isMfaRequiredFor, mfaService } from './mfa.service.js';
import type { LoginInput, LoginResult, PublicUser, RegisterInput, UserRole } from './auth.types.js';

type Context = Pick<AuditEntry, 'ipAddress' | 'userAgent'>;

// Verified against when the phone is unknown so response time does not reveal whether an account exists.
const dummyPasswordHash = hashPassword('timing-equalisation-only');

function normalizePhone(value: string): string {
  const normalized = normalizeIvorianPhone(value);
  if (!normalized) throw new AppError('Numéro ivoirien invalide (format attendu : 07 00 00 00 00).', 400, 'INVALID_PHONE');
  return normalized;
}

async function createSession(user: PublicUser) {
  const { token, claims } = signJwt({ sub: user.id, role: user.role, expiresInSeconds: appConfig.sessionTtlSeconds });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await authRepository.storeSession(tokenHash, user.id, new Date(claims.exp * 1000));
  return token;
}

async function recordFailure(userId: string, factor: 'password' | 'mfa', context: Context): Promise<void> {
  const { locked } = await mfaRepository.recordLoginFailure(userId, appConfig.lockout.maxFailures, appConfig.lockout.durationMs);
  await auditService.record({ action: 'auth.login_failed', userId, metadata: { factor }, ...context });
  if (locked) {
    await securityEventService.record({ userId, eventType: 'auth.account_locked', metadata: { severity: 'high', factor }, ...context });
  }
}

function assertNotLocked(lockedUntil: Date | null | undefined): void {
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    throw new AppError('Compte temporairement verrouillé. Réessayez plus tard.', 429, 'ACCOUNT_LOCKED');
  }
}

export const authService = {
  async register(input: RegisterInput, context: Context = {}): Promise<{ user: PublicUser; token: string }> {
    const phone = normalizePhone(input.phone);
    const passwordHash = await authRepository.hashPassword(input.password);
    const account = { id: randomUUID(), fullName: input.fullName.trim(), phone, password: passwordHash };
    // A code that is present but wrong is an error, never a silent downgrade to a traveler account.
    const invite = input.partnerInviteCode?.trim()
      ? await authRepository.createPartnerWithInvite(account, hashInviteCode(input.partnerInviteCode))
      : null;
    const user = (invite ? invite.user : await authRepository.createUser({ ...account, role: 'traveler' })) as PublicUser;
    const role: UserRole = invite ? 'partner' : 'traveler';
    const token = await createSession(user);
    await auditService.record({
      action: 'auth.register',
      userId: user.id,
      resourceType: 'user',
      resourceId: user.id,
      metadata: invite ? { role, providerId: invite.providerId, providerRole: invite.providerRole } : { role },
      ...context,
    });
    logger.info({ userId: user.id, role }, 'Compte créé');
    return { user, token };
  },

  async login(input: LoginInput, context: Context = {}): Promise<LoginResult> {
    const phone = normalizePhone(input.phone);
    const user = await authRepository.findUserByPhone(phone);
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await securityEventService.record({ userId: user.id, eventType: 'auth.login_while_locked', ...context });
    }
    assertNotLocked(user?.lockedUntil);

    const passwordOk = await verifyPassword(input.password, user ? user.passwordHash : await dummyPasswordHash);
    if (!user || !passwordOk) {
      if (user) await recordFailure(user.id, 'password', context);
      else await auditService.record({ action: 'auth.login_failed', metadata: { reason: 'unknown_account' }, ...context });
      throw new AppError('Numéro ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    if (user.mfaEnabledAt) {
      // No session exists until the second factor is verified.
      return { mfaRequired: true, challengeToken: mfaService.issueChallenge(user.id) };
    }
    await mfaRepository.clearLoginFailures(user.id);
    const publicUser: PublicUser = { id: user.id, fullName: user.fullName, phone: user.phone, role: user.role as UserRole };
    const token = await createSession(publicUser);
    await auditService.record({ action: 'auth.login', userId: user.id, resourceType: 'user', resourceId: user.id, ...context });
    logger.info({ userId: user.id }, 'Connexion réussie');
    return { user: publicUser, token };
  },

  async completeMfaLogin(challengeToken: string, code: string, context: Context = {}): Promise<{ user: PublicUser; token: string }> {
    const userId = mfaService.challengeUser(challengeToken);
    const user = await mfaRepository.findUser(userId);
    if (!user?.mfaEnabledAt) throw new AppError('La vérification a expiré. Reconnectez-vous.', 401, 'MFA_CHALLENGE_INVALID');
    assertNotLocked(user.lockedUntil);
    if (!(await mfaService.verifyCode(user.id, code))) {
      await recordFailure(user.id, 'mfa', context);
      throw new AppError('Code de vérification incorrect.', 401, 'MFA_CODE_INVALID');
    }
    await mfaRepository.clearLoginFailures(user.id);
    const publicUser: PublicUser = { id: user.id, fullName: user.fullName, phone: user.phone, role: user.role as UserRole };
    const token = await createSession(publicUser);
    await auditService.record({ action: 'auth.login', userId: user.id, resourceType: 'user', resourceId: user.id, metadata: { mfa: true }, ...context });
    return { user: publicUser, token };
  },

  async logout(tokenHash?: string, userId?: string, context: Context = {}): Promise<void> {
    if (tokenHash) await authRepository.deleteSession(tokenHash);
    if (userId) await auditService.record({ action: 'auth.logout', userId, ...context });
  },
};

export { isMfaRequiredFor };
