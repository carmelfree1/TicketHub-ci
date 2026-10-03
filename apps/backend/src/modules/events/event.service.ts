import { AppError } from '../../core/errors/AppError.js';
import { eventRepository } from './event.repository.js';
import type { EventQuery } from './event.types.js';

export const eventService = {
  list(query: EventQuery = {}) { return eventRepository.list(query); },
  async get(id: string) {
    const event = await eventRepository.findById(id);
    if (!event) throw new AppError('Événement introuvable.', 404, 'EVENT_NOT_FOUND');
    return event;
  },
};
