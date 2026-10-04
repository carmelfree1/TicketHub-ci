import { type AuthUser, type DigitalTicket, type TicketedEvent, type TripDeparture } from '@/types';
import { API_BASE_URL } from '@/lib/constants';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ApiErrorResponse {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload as ApiErrorResponse;
    throw new ApiError(
      error.error?.message || `La requête a échoué (${response.status}).`,
      response.status,
      error.error?.code,
    );
  }
  return payload as T;
}

export interface BookingResponse {
  id: string;
  product_type: 'transport' | 'event';
  amount_xof: number;
  status: 'pending_payment' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'needs_review';
  hold_expires_at: string;
  [key: string]: unknown;
}

export interface BookingDetails extends BookingResponse {
  provider_reference?: string;
  checkout_url?: string;
  payment_status?: string;
  carrier?: string;
  depart_city?: string;
  depart_station?: string;
  arrival_city?: string;
  arrival_station?: string;
  depart_at?: string;
  event_title?: string;
  venue?: string;
  city?: string;
  starts_at?: string;
  category_name?: string;
}

export interface PartnerManifestRecord {
  ticketCode: string;
  status: 'active' | 'used' | 'cancelled';
  usedAt?: string | null;
  bookingId: string;
  price: number;
  seatNumber?: number | null;
  name: string;
  phone: string;
  paymentMethod?: string | null;
}

export interface TicketRecord extends Partial<DigitalTicket> {
  id: string;
  ticketCode: string;
  commandRef: string;
  productType: 'transport' | 'event';
  passengerName: string;
  passengerPhone: string;
  status: 'active' | 'used' | 'cancelled';
  qrPayload: string;
  price: number;
  category?: string;
  city?: string;
  quantity?: number;
}

export const api = {
  async me(): Promise<AuthUser | null> {
    const result = await request<{ user: AuthUser | null }>('/auth/me');
    return result.user;
  },

  async login(input: { phone: string; password: string }): Promise<AuthUser> {
    const result = await request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result.user;
  },

  async register(input: { fullName: string; phone: string; password: string; partnerInviteCode?: string }): Promise<AuthUser> {
    const result = await request<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result.user;
  },

  async logout(): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' });
  },

  async profile(): Promise<AuthUser> {
    const result = await request<{ data: { user: AuthUser } }>('/users/me');
    return result.data.user;
  },

  async updateProfile(input: { fullName?: string; phone?: string }): Promise<AuthUser> {
    const result = await request<{ data: { user: AuthUser } }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return result.data.user;
  },

  async orders(): Promise<unknown[]> {
    const result = await request<{ data: unknown[] }>('/orders');
    return result.data;
  },

  async trips(filters: { from?: string; to?: string; date?: string } = {}): Promise<TripDeparture[]> {
    const query = new URLSearchParams();
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
    if (filters.date) query.set('date', filters.date);
    const suffix = query.size ? `?${query.toString()}` : '';
    const result = await request<{ data: TripDeparture[] }>(`/catalog/trips${suffix}`);
    return result.data;
  },

  async events(): Promise<TicketedEvent[]> {
    const result = await request<{ data: TicketedEvent[] }>('/catalog/events');
    return result.data;
  },

  async seats(tripId: string): Promise<{ capacity: number; seats: { number: number; status: 'available' | 'occupied' }[] }> {
    return request(`/catalog/trips/${encodeURIComponent(tripId)}/seats`);
  },

  async createTransportBooking(tripId: string, seats: number[]): Promise<BookingResponse> {
    const result = await request<{ data: BookingResponse }>('/bookings/transport', {
      method: 'POST',
      body: JSON.stringify({ tripId, seats }),
    });
    return result.data;
  },

  async createEventBooking(eventId: string, categoryId: string, quantity: number): Promise<BookingResponse> {
    const result = await request<{ data: BookingResponse }>('/bookings/event', {
      method: 'POST',
      body: JSON.stringify({ eventId, categoryId, quantity }),
    });
    return result.data;
  },

  async startPayment(bookingId: string, paymentMethod: string): Promise<{ checkoutUrl: string; providerReference: string; status: string }> {
    const result = await request<{ data: { checkoutUrl: string; providerReference: string; status: string } }>(
      `/bookings/${encodeURIComponent(bookingId)}/payment`,
      { method: 'POST', body: JSON.stringify({ paymentMethod }) },
    );
    return result.data;
  },

  async booking(bookingId: string): Promise<BookingDetails> {
    const result = await request<{ data: BookingDetails }>(`/bookings/${encodeURIComponent(bookingId)}`);
    return result.data;
  },

  async tickets(): Promise<TicketRecord[]> {
    const result = await request<{ data: TicketRecord[] }>('/tickets');
    return result.data;
  },

  async scanTicket(input: { token?: string; ticketCode?: string }): Promise<Record<string, unknown>> {
    const result = await request<{ data: Record<string, unknown> }>('/partner/scans', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result.data;
  },

  async partnerManifest(tripId: string): Promise<PartnerManifestRecord[]> {
    const result = await request<{ data: PartnerManifestRecord[] }>(`/partner/manifest/${encodeURIComponent(tripId)}`);
    return result.data;
  },
};
