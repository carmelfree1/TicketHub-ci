import { logger } from '../../core/logger/logger.js';
import { securityEventRepository } from './security-event.repository.js';
import type { SecurityEventInput } from './security-event.types.js';

export const securityEventService = {
  async record(input: SecurityEventInput) {
    try { return await securityEventRepository.create(input); }
    catch (error) {
      logger.warn({ err: error, eventType: input.eventType }, 'Événement de sécurité non persisté');
      return null;
    }
  },
};
