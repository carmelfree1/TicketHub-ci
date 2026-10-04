import { prisma, transaction } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';
import { hashPassword } from '../../core/security/password.js';
import type { UserRole } from './auth.types.js';

const db = prisma;

export const authRepository = {
  findUserByPhone(phone: string) {
    return db.user.findUnique({ where: { phone } });
  },

  createUser(input: { id: string; fullName: string; phone: string; password: string; role: UserRole }) {
    return db.user.create({
      data: {
        id: input.id,
        fullName: input.fullName,
        phone: input.phone,
        passwordHash: input.password,
        role: input.role,
      },
      select: { id: true, fullName: true, phone: true, role: true, createdAt: true },
    });
  },

  /**
   * Creates a partner account and links it to the company that issued the invitation, atomically: the invitation
   * is consumed in the same transaction, so two concurrent sign-ups can never share one code.
   */
  createPartnerWithInvite(input: { id: string; fullName: string; phone: string; password: string }, codeHash: string) {
    return transaction(async (tx) => {
      const now = new Date();
      const invite = await tx.providerInvite.findUnique({ where: { codeHash }, include: { provider: true } });
      const invalid = () => new AppError('Code d’invitation invalide, expiré ou déjà utilisé.', 400, 'INVALID_INVITE');
      if (!invite || invite.usedAt || invite.expiresAt <= now || invite.provider.status !== 'active') throw invalid();
      const claimed = await tx.providerInvite.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: now, usedBy: input.id } });
      if (claimed.count !== 1) throw invalid();
      const user = await tx.user.create({
        data: { id: input.id, fullName: input.fullName, phone: input.phone, passwordHash: input.password, role: 'partner' },
        select: { id: true, fullName: true, phone: true, role: true, createdAt: true },
      });
      await tx.providerMember.create({ data: { providerId: invite.providerId, userId: user.id, role: invite.role } });
      return { user, providerId: invite.providerId, providerRole: invite.role };
    }, { isolationLevel: 'Serializable' });
  },

  async storeSession(tokenHash: string, userId: string, expiresAt: Date) {
    return db.session.create({ data: { tokenHash, userId, expiresAt } });
  },

  async deleteSession(tokenHash: string) {
    await db.session.deleteMany({ where: { tokenHash } });
  },

  hashPassword,
};
