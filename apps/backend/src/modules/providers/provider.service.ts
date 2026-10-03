import { AppError } from '../../core/errors/AppError.js';
import { providerRepository } from './provider.repository.js';

export const providerService = {
  async list() { return providerRepository.list(); },
  async get(id: string) {
    const provider = await providerRepository.findById(id);
    if (!provider || provider.status !== 'active') throw new AppError('Transporteur introuvable.', 404, 'PROVIDER_NOT_FOUND');
    return provider;
  },
};
