import { type AuthUser, type DigitalTicket, type TicketedEvent, type TripDeparture } from '@/types';
import { TERMS_VERSION } from '@tickethub/shared';
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

export interface SecurityStatus {
  mfaEnabled: boolean;
  mfaRequired: boolean;
}

export type LoginOutcome = { user: AuthUser; mfaRequired?: undefined } | { mfaRequired: true; challengeToken: string };

interface ApiErrorResponse {
  error?: { code?: string; message?: string };
}

export type Account = 'traveler' | 'partner';

/**
 * `account` names which of the two simultaneous sessions a shared authentication route should act on. Partner
 * endpoints (`/partner/...`) always use the partner session, so they need no hint.
 */
async function request<T>(path: string, init: RequestInit = {}, account?: Account): Promise<T> {
  const headers = new Headers(init.headers);
  if (account) headers.set('X-Account', account);
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

export interface PartnerProvider {
  id: string;
  code: string;
  name: string;
  role: 'owner' | 'manager' | 'scanner';
}

export interface PartnerTrip {
  id: string;
  carrier: string;
  departAt: string;
  departCity: string;
  departStation: string;
  arrivalCity: string;
  arrivalStation: string;
  seatCapacity: number;
  seatsSold: number;
}

export type StatsPeriod = 'today' | 'week' | 'month';

export interface PartnerStats {
  period: StatsPeriod;
  grossXof: number;
  commissionXof: number;
  netXof: number;
  ticketsSold: number;
  orders: number;
  ticketsScanned: number;
}

export const api = {
  async me(account: Account): Promise<{ user: AuthUser | null; security: SecurityStatus | null }> {
    return request<{ user: AuthUser | null; security: SecurityStatus | null }>('/auth/me', {}, account);
  },

  async login(input: { phone: string; password: string }): Promise<LoginOutcome> {
    return request<LoginOutcome>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async loginMfa(input: { challengeToken: string; code: string }): Promise<AuthUser> {
    const result = await request<{ user: AuthUser }>('/auth/login/mfa', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result.user;
  },

  async mfaSetup(account: Account): Promise<{ secret: string; otpauthUri: string }> {
    return (await request<{ data: { secret: string; otpauthUri: string } }>('/auth/mfa/setup', { method: 'POST' }, account)).data;
  },

  async mfaEnable(code: string, account: Account): Promise<{ backupCodes: string[] }> {
    return (await request<{ data: { backupCodes: string[] } }>('/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }, account)).data;
  },

  async mfaDisable(input: { password: string; code: string }, account: Account): Promise<void> {
    await request<void>('/auth/mfa/disable', { method: 'POST', body: JSON.stringify(input) }, account);
  },

  async register(input: { fullName: string; phone: string; password: string; partnerInviteCode?: string }): Promise<AuthUser> {
    const result = await request<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      // Creating an account is the moment the person accepts the terms shown next to the button.
      body: JSON.stringify({ ...input, acceptTerms: true, termsVersion: TERMS_VERSION }),
    });
    return result.user;
  },

  async logout(account: Account): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' }, account);
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

  async partnerMe(): Promise<PartnerProvider[]> {
    return (await request<{ data: { providers: PartnerProvider[] } }>('/partner/me')).data.providers;
  },

  async partnerTrips(): Promise<PartnerTrip[]> {
    return (await request<{ data: PartnerTrip[] }>('/partner/trips')).data;
  },

  async partnerStats(period: StatsPeriod): Promise<PartnerStats> {
    return (await request<{ data: PartnerStats }>(`/partner/stats?period=${period}`)).data;
  },

  async partnerManifest(tripId: string): Promise<PartnerManifestRecord[]> {
    const result = await request<{ data: PartnerManifestRecord[] }>(`/partner/manifest/${encodeURIComponent(tripId)}`);
    return result.data;
  },
};
