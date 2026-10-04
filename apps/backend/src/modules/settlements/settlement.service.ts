import { AppError } from '../../core/errors/AppError.js';
import { providerAccess } from '../providers/provider-access.js';
import { settlementRepository } from './settlement.repository.js';

async function transitionOrExplain(done: boolean, id: string, expected: string): Promise<void> {
  if (done) return;
  const current = await settlementRepository.findById(id);
  if (!current) throw new AppError('Règlement introuvable.', 404, 'SETTLEMENT_NOT_FOUND');
  throw new AppError(`Ce règlement est « ${current.status} » et ne peut pas passer à cet état (attendu : ${expected}).`, 409, 'SETTLEMENT_INVALID_TRANSITION');
}

export const settlementService = {
  async approve(id: string) { await transitionOrExplain(await settlementRepository.approve(id), id, 'pending'); },
  async markPaid(id: string, payoutReference: string) {
    if (!payoutReference.trim()) throw new AppError('La référence du virement est obligatoire.', 400, 'PAYOUT_REFERENCE_REQUIRED');
    await transitionOrExplain(await settlementRepository.markPaid(id, payoutReference.trim().slice(0, 160)), id, 'approved');
  },
  async cancel(id: string) { await transitionOrExplain(await settlementRepository.cancel(id), id, 'pending ou approved'); },
  list(status?: string) { return settlementRepository.list(status); },
  generate(periodStart: Date, periodEnd: Date) { return settlementRepository.generate(periodStart, periodEnd); },
  async listForUser(userId: string) {
    const memberships = await providerAccess.requireMemberships(userId);
    return settlementRepository.listForProviders(memberships.map((membership) => membership.providerCode));
  },
};
