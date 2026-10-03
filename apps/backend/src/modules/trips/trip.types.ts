export interface TripQuery {
  from?: string;
  to?: string;
  date?: string;
}

export interface SeatAvailability {
  tripId: string;
  capacity: number;
  seats: Array<{ number: number; status: 'available' | 'occupied' }>;
}
