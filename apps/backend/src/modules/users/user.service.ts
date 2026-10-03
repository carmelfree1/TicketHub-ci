import { normalizeCiPhone as normalizeIvorianPhone } from '@tickethub/shared';
import { AppError } from '../../core/errors/AppError.js';
import { userRepository } from './user.repository.js';
import type { UpdateProfileInput } from './user.types.js';

function normalizePhone(phone: string): string {
  const normalized = normalizeIvorianPhone(phone);
  if (!normalized) throw new AppError('Numéro ivoirien invalide.', 400, 'INVALID_PHONE');
  return normalized;
}

export const userService = {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('Utilisateur introuvable.', 404, 'USER_NOT_FOUND');
    return user;
  },
  async updateProfile(userId: string, input: UpdateProfileInput) {
    return userRepository.update(userId, { ...input, ...(input.phone ? { phone: normalizePhone(input.phone) } : {}) });
  },
};
