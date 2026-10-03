import { settlementRepository } from './settlement.repository.js';

export const settlementService = {
  generate(periodStart: Date, periodEnd: Date) { return settlementRepository.generate(periodStart, periodEnd); },
  list() { return settlementRepository.list(); },
};
