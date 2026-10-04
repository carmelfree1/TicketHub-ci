export type AppScreen =
  | 'explorer'
  | 'seat-selection'
  | 'event-selection'
  | 'payment'
  | 'payment-result'
  | 'digital-pass'
  | 'tickets-wallet'
  | 'partner-dashboard'
  | 'partner-scanner'
  | 'partner-manifest';

export type UserRole = 'traveler' | 'partner';

export type PaymentMethodId = 'wave' | 'orange' | 'mtn' | 'moov' | 'cb';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface TripDeparture {
  id: string;
  carrier: string;
  carrierCode: string;
  serviceTitle: string;
  tag?: string;
  tagType?: 'best-price' | 'guaranteed' | 'standard';
  departTime: string;
  departStation: string;
  departCity: string;
  arrivalTime: string;
  arrivalStation: string;
  arrivalCity: string;
  duration: string;
  price: number;
  availableSeats: number;
  amenities: string[];
  vehicle: string;
  registration: string;
  departAt?: string;
  seatCapacity?: number;
  occupiedSeats?: number[];
}

export interface TicketCategory {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
}

export interface TicketedEvent {
  id: string;
  title: string;
  eventType: 'concert' | 'sport' | 'show';
  description: string;
  venue: string;
  city: string;
  startsAt: string;
  imageUrl: string;
  categories: TicketCategory[];
}

export interface BusSeat {
  number: number;
  row: number;
  column: 'A' | 'B' | 'C' | 'D';
  isWindow: boolean;
  status: 'available' | 'selected' | 'occupied' | 'locked-third-party';
  passengerName?: string;
  ticketCode?: string;
}

export interface DigitalTicket {
  ticketCode: string;
  commandRef: string;
  carrier: string;
  category: string;
  departCity: string;
  departStation: string;
  arrivalCity: string;
  arrivalStation: string;
  departureDate: string;
  departureTime: string;
  boardingTime: string;
  duration: string;
  seats: number[];
  passengerName: string;
  passengerPhone: string;
  cniVerified: boolean;
  price: number;
  paymentMethod: string;
  status: 'active' | 'used' | 'cancelled';
  quai: string;
  qrPayload: string;
  issuedAt: string;
  luggage: string;
  productType?: 'transport' | 'event';
  eventTitle?: string;
  venue?: string;
  eventCategory?: string;
  startsAt?: string;
  quantity?: number;
}

export interface ManifestPassenger {
  seatNumber: number;
  name: string;
  phone: string;
  ticketCode: string;
  operator: string;
  price: number;
  status: 'boarded' | 'pending' | 'absent';
  scanTime?: string;
  scanLocation?: string;
  luggageCount: number;
}
