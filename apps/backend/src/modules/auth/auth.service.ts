import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { normalizeCiPhone as normalizeIvorianPhone } from '@tickethub/shared';
import { env } from '../../config/env.js';
import { appConfig } from '../../config/app.config.js';
import { AppError } from '../../core/errors/AppError.js';
import { signJwt } from '../../core/security/jwt.js';
import { verifyPassword } from '../../core/security/password.js';
import { logger } from '../../core/logger/logger.js';
import { authRepository } from './auth.repository.js';
import type { LoginInput, PublicUser, RegisterInput, UserRole } from './auth.types.js';

function normalizePhone(value: string): string {
  const normalized = normalizeIvorianPhone(value);
  if (!normalized) throw new AppError('Numéro ivoirien invalide (format attendu : 07 00 00 00 00).', 400, 'INVALID_PHONE');
  return normalized;
}

function matchesInviteCode(value?: string): boolean {
  if (!env.PARTNER_INVITE_CODE || !value) return false;
  const provided = Buffer.from(value);
  const expected = Buffer.from(env.PARTNER_INVITE_CODE);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function createSession(user: PublicUser) {
  const { token, claims } = signJwt({ sub: user.id, role: user.role, expiresInSeconds: appConfig.sessionTtlSeconds });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await authRepository.storeSession(tokenHash, user.id, new Date(claims.exp * 1000));
  return token;
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
    const phone = normalizePhone(input.phone);
    const passwordHash = await authRepository.hashPassword(input.password);
    const role: UserRole = matchesInviteCode(input.partnerInviteCode) ? 'partner' : 'traveler';
    const user = await authRepository.createUser({
      id: randomUUID(),
      fullName: input.fullName.trim(),
      phone,
      password: passwordHash,
      role,
    }) as PublicUser;
    const token = await createSession(user);
    logger.info({ userId: user.id, role }, 'Compte créé');
    return { user, token };
  },

  async login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
    const phone = normalizePhone(input.phone);
    const user = await authRepository.findUserByPhone(phone);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError('Numéro ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    const publicUser: PublicUser = { id: user.id, fullName: user.fullName, phone: user.phone, role: user.role as UserRole };
    const token = await createSession(publicUser);
    logger.info({ userId: user.id }, 'Connexion réussie');
    return { user: publicUser, token };
  },

  async logout(tokenHash?: string): Promise<void> {
    if (tokenHash) await authRepository.deleteSession(tokenHash);
  },
};
