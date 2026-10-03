export type AppScreen =
  | 'explorer'
  | 'seat-selection'
  | 'payment'
  | 'digital-pass'
  | 'tickets-wallet'
  | 'partner-dashboard'
  | 'partner-fleet'
  | 'partner-scanner'
  | 'partner-manifest';

export type UserRole = 'traveler' | 'partner';

export type PaymentMethodId = 'wave' | 'orange' | 'mtn' | 'moov' | 'cb';

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
