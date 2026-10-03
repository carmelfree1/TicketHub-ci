import { prisma } from '../../config/database.js';
import { hashPassword } from '../../core/security/password.js';
import type { UserRole } from './auth.types.js';

const db = prisma as any;

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

  async storeSession(tokenHash: string, userId: string, expiresAt: Date) {
    return db.session.create({ data: { tokenHash, userId, expiresAt } });
  },

  async deleteSession(tokenHash: string) {
    await db.session.deleteMany({ where: { tokenHash } });
  },

  hashPassword,
};
