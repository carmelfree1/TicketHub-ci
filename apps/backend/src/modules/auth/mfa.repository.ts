import { randomUUID } from 'node:crypto';
import { prisma, transaction } from '../../config/database.js';

const db = prisma;

export const mfaRepository = {
  findUser(userId: string) {
    return db.user.findUnique({ where: { id: userId } });
  },

  storePendingSecret(userId: string, encryptedSecret: string) {
    return db.user.update({ where: { id: userId }, data: { mfaSecret: encryptedSecret, mfaEnabledAt: null, mfaLastStep: null } });
  },

  /** Enables MFA and replaces the backup codes in one transaction. */
  enable(userId: string, step: number, codeHashes: string[]) {
    return transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { mfaEnabledAt: new Date(), mfaLastStep: BigInt(step) } });
      await tx.mfaBackupCode.deleteMany({ where: { userId } });
      await tx.mfaBackupCode.createMany({ data: codeHashes.map((codeHash) => ({ id: randomUUID(), userId, codeHash })) });
    });
  },

  disable(userId: string) {
    return transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { mfaSecret: null, mfaEnabledAt: null, mfaLastStep: null } });
      await tx.mfaBackupCode.deleteMany({ where: { userId } });
    });
  },

  /** Atomically accepts a time step only if it is newer than the last one used, so a code is never accepted twice. */
  async consumeStep(userId: string, step: number): Promise<boolean> {
    const result = await db.$executeRaw`
      UPDATE users SET mfa_last_step = ${step}
      WHERE id = ${userId} AND (mfa_last_step IS NULL OR mfa_last_step < ${step})`;
    return result === 1;
  },

  async consumeBackupCode(userId: string, codeHash: string): Promise<boolean> {
    const result = await db.mfaBackupCode.updateMany({ where: { userId, codeHash, usedAt: null }, data: { usedAt: new Date() } });
    return result.count === 1;
  },

  remainingBackupCodes(userId: string) {
    return db.mfaBackupCode.count({ where: { userId, usedAt: null } });
  },

  async recordLoginFailure(userId: string, maxFailures: number, lockMs: number): Promise<{ locked: boolean }> {
    const user = await db.user.update({ where: { id: userId }, data: { failedLoginCount: { increment: 1 } }, select: { failedLoginCount: true } });
    if (user.failedLoginCount < maxFailures) return { locked: false };
    await db.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + lockMs) } });
    return { locked: true };
  },

  clearLoginFailures(userId: string) {
    return db.user.updateMany({ where: { id: userId, OR: [{ failedLoginCount: { gt: 0 } }, { lockedUntil: { not: null } }] }, data: { failedLoginCount: 0, lockedUntil: null } });
  },
};
