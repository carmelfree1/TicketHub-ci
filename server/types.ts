export type UserRole = 'traveler' | 'partner';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface BusTripRow {
  id: string;
  carrier: string;
  carrier_code: string;
  service_title: string;
  depart_at: Date | string;
  depart_station: string;
  depart_city: string;
  arrival_station: string;
  arrival_city: string;
  arrival_time: string;
  duration: string;
  price_xof: number;
  seat_capacity: number;
  amenities: string[];
  vehicle: string;
  registration: string;
  occupied_seats?: number[];
}

export interface TicketRow {
  id: string;
  booking_id: string;
  ordinal: number;
  code: string;
  status: 'active' | 'used' | 'cancelled';
  used_at: Date | string | null;
  created_at: Date | string;
  product_type: 'transport' | 'event';
  amount_xof: number;
  carrier?: string;
  depart_city?: string;
  depart_station?: string;
  arrival_city?: string;
  arrival_station?: string;
  depart_at?: Date | string;
  event_title?: string;
  venue?: string;
  city?: string;
  starts_at?: Date | string;
  category_name?: string;
  seats?: number[];
  passenger_name: string;
  passenger_phone: string;
}
