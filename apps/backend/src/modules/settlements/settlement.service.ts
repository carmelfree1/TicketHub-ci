import { providerAccess } from '../providers/provider-access.js';
import { settlementRepository } from './settlement.repository.js';

export const settlementService = {
  generate(periodStart: Date, periodEnd: Date) { return settlementRepository.generate(periodStart, periodEnd); },
  async listForUser(userId: string) {
    const memberships = await providerAccess.requireMemberships(userId);
    return settlementRepository.listForProviders(memberships.map((membership) => membership.providerCode));
  },
};
