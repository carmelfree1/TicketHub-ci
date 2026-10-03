import { catalogRepository } from './catalog.repository.js';

export const catalogService = {
  summary() { return catalogRepository.summary(); },
};
