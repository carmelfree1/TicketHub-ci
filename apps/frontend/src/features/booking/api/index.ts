import { api } from '@/services/api';

export const bookingApi = {
  createTransport: api.createTransportBooking,
  createEvent: api.createEventBooking,
  get: api.booking,
};
