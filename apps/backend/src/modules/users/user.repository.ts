import { prisma } from '../../config/database.js';
import type { UpdateProfileInput } from './user.types.js';

const db = prisma as any;

export const userRepository = {
  findById(id: string) {
    return db.user.findUnique({ where: { id }, select: { id: true, fullName: true, phone: true, role: true, createdAt: true } });
  },
  update(id: string, data: UpdateProfileInput & { phone?: string }) {
    return db.user.update({ where: { id }, data, select: { id: true, fullName: true, phone: true, role: true } });
  },
};
