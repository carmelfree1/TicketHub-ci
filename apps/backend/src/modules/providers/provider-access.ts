import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { prisma, type DbTransaction } from '../../config/database.js';
import { AppError } from '../../core/errors/AppError.js';

export type ProviderRole = 'owner' | 'manager' | 'scanner';

export interface Membership {
  providerId: string;
  providerCode: string;
  providerName: string;
  providerStatus: string;
  role: ProviderRole;
}

export const hashInviteCode = (code: string) => createHash('sha256').update(code.trim().toUpperCase()).digest('hex');

/** Provider data a partner user may touch. Everything partner facing is scoped through this, never through the role alone. */
export const providerAccess = {
  async membershipsOf(userId: string, client: Pick<DbTransaction, 'providerMember'> = prisma): Promise<Membership[]> {
    const rows = await client.providerMember.findMany({
      where: { userId, provider: { status: 'active' } },
      include: { provider: true },
      orderBy: { provider: { name: 'asc' } },
    });
    return rows.map((row) => ({
      providerId: row.providerId,
      providerCode: row.provider.code,
      providerName: row.provider.name,
      providerStatus: row.provider.status,
      role: row.role as ProviderRole,
    }));
  },

  /** True when the user belongs to the (active) provider. `roles` narrows which memberships count. */
  async isMember(client: Pick<DbTransaction, 'providerMember'>, userId: string, providerId: string, roles?: ProviderRole[]): Promise<boolean> {
    const member = await client.providerMember.findFirst({
      where: { userId, providerId, provider: { status: 'active' }, ...(roles ? { role: { in: roles } } : {}) },
      select: { userId: true },
    });
    return member !== null;
  },

  async providerIdsOf(userId: string): Promise<string[]> {
    return (await providerAccess.membershipsOf(userId)).map((membership) => membership.providerId);
  },

  /** Errors with 403 NO_PROVIDER when a partner account has not been linked to any company yet. */
  async requireMemberships(userId: string): Promise<Membership[]> {
    const memberships = await providerAccess.membershipsOf(userId);
    if (memberships.length === 0) {
      throw new AppError('Votre compte n’est rattaché à aucune société. Utilisez le code d’invitation fourni par votre société.', 403, 'NO_PROVIDER');
    }
    return memberships;
  },
};

/** Creates a single-use invitation and returns the clear code once; only its hash is stored. */
export async function createProviderInvite(input: { providerId: string; role: ProviderRole; ttlDays: number }): Promise<{ code: string; expiresAt: Date }> {
  const code = `INV-${randomBytes(6).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + input.ttlDays * 24 * 60 * 60 * 1000);
  await prisma.providerInvite.create({
    data: { id: randomUUID(), providerId: input.providerId, codeHash: hashInviteCode(code), role: input.role, expiresAt },
  });
  return { code, expiresAt };
}
