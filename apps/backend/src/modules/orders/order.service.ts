import { AppError } from '../../core/errors/AppError.js';
import { orderRepository } from './order.repository.js';

export const orderService = {
  async getBooking(userId: string, bookingId: string) {
    const booking = await orderRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new AppError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');
    return booking;
  },
  list(userId: string) { return orderRepository.listOrders(userId); },
};
