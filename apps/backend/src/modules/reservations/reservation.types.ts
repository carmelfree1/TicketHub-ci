export interface TransportReservationInput {
  tripId: string;
  seats: number[];
}
export interface EventReservationInput {
  eventId: string;
  categoryId: string;
  quantity: number;
}
