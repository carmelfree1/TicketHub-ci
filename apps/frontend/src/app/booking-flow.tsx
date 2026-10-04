import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { type DigitalTicket, type TicketCategory, type TicketedEvent, type TripDeparture } from '@/types';

/** Selection and hold made during checkout. Lives in memory only; a reload restarts the purchase from the catalog. */
export interface BookingDraft {
  trip: TripDeparture | null;
  seats: number[];
  event: TicketedEvent | null;
  category: TicketCategory | null;
  quantity: number;
  totalPrice: number;
  bookingId: string;
  holdExpiresAt: string;
}

const emptyDraft: BookingDraft = {
  trip: null,
  seats: [],
  event: null,
  category: null,
  quantity: 1,
  totalPrice: 0,
  bookingId: '',
  holdExpiresAt: '',
};

interface BookingFlowValue {
  draft: BookingDraft;
  digitalTicket: DigitalTicket | null;
  selectTrip: (trip: TripDeparture) => void;
  selectEvent: (event: TicketedEvent) => void;
  holdCreated: (hold: Pick<BookingDraft, 'seats' | 'category' | 'quantity' | 'totalPrice' | 'bookingId' | 'holdExpiresAt'>) => void;
  showTicket: (ticket: DigitalTicket) => void;
  reset: () => void;
}

const BookingFlowContext = createContext<BookingFlowValue | null>(null);

export function BookingFlowProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [digitalTicket, setDigitalTicket] = useState<DigitalTicket | null>(null);

  const selectTrip = useCallback((trip: TripDeparture) => {
    setDraft({ ...emptyDraft, trip, totalPrice: trip.price });
  }, []);

  const selectEvent = useCallback((event: TicketedEvent) => {
    setDraft({ ...emptyDraft, event, category: event.categories[0] ?? null });
  }, []);

  const holdCreated = useCallback<BookingFlowValue['holdCreated']>((hold) => {
    setDraft((current) => ({ ...current, ...hold }));
  }, []);

  const value = useMemo<BookingFlowValue>(() => ({
    draft,
    digitalTicket,
    selectTrip,
    selectEvent,
    holdCreated,
    showTicket: setDigitalTicket,
    reset: () => { setDraft(emptyDraft); setDigitalTicket(null); },
  }), [draft, digitalTicket, selectTrip, selectEvent, holdCreated]);

  return <BookingFlowContext.Provider value={value}>{children}</BookingFlowContext.Provider>;
}

export function useBookingFlow(): BookingFlowValue {
  const value = useContext(BookingFlowContext);
  if (!value) throw new Error('useBookingFlow must be used inside BookingFlowProvider');
  return value;
}
