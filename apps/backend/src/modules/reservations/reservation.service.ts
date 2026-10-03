import { reservationRepository } from './reservation.repository.js';
import type { EventReservationInput, TransportReservationInput } from './reservation.types.js';

export const reservationService = {
  createTransport(userId: string, input: TransportReservationInput) { return reservationRepository.createTransport(userId, input); },
  createEvent(userId: string, input: EventReservationInput) { return reservationRepository.createEvent(userId, input); },
};
