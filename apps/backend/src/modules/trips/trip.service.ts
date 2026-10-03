import { AppError } from '../../core/errors/AppError.js';
import { tripRepository } from './trip.repository.js';
import type { TripQuery } from './trip.types.js';

export const tripService = {
  list(query: TripQuery) { return tripRepository.list(query); },
  async seats(tripId: string) {
    const result = await tripRepository.findForSeats(tripId);
    if (!result) throw new AppError('Départ introuvable ou expiré.', 404, 'TRIP_UNAVAILABLE');
    return result;
  },
};
