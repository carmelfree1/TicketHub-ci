import { prisma } from '../../config/database.js';
const db = prisma as any;

export const providerRepository = {
  list() { return db.provider.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } }); },
  findById(id: string) { return db.provider.findUnique({ where: { id } }); },
};
