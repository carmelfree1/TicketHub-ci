import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { type AppScreen } from '@/types';
import { useBookingFlow } from './booking-flow';
import { paths, screenFromPath } from './paths';
import { useSession } from './session';

export function useCurrentScreen(): AppScreen {
  return screenFromPath(useLocation().pathname) ?? 'explorer';
}

/**
 * Adapter that keeps the existing screens' `onNavigate(screen)` contract while the URL becomes the source of truth.
 * Partner screens ask a signed-out visitor to sign in instead of showing an authorization error page.
 */
export function useScreenNavigation() {
  const navigate = useNavigate();
  const { user, openProfile, refreshTickets } = useSession();
  const { draft, digitalTicket } = useBookingFlow();

  return useCallback((screen: AppScreen) => {
    const go = (to: string) => {
      navigate(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    switch (screen) {
      case 'explorer': return go(paths.home);
      case 'seat-selection': return go(draft.trip ? paths.trip(draft.trip.id) : paths.home);
      case 'event-selection': return go(draft.event ? paths.event(draft.event.id) : paths.home);
      case 'payment': return go(draft.bookingId ? paths.payment : paths.home);
      case 'payment-result': return go(paths.paymentReturn);
      case 'digital-pass': return go(digitalTicket ? paths.ticket(digitalTicket.ticketCode) : paths.wallet);
      case 'tickets-wallet':
        if (user?.role === 'partner') return go(paths.partner);
        refreshTickets();
        return go(paths.wallet);
      case 'partner-dashboard':
      case 'partner-fleet':
      case 'partner-scanner':
      case 'partner-manifest': {
        if (user?.role !== 'partner') {
          openProfile();
          return;
        }
        const target = {
          'partner-dashboard': paths.partner,
          'partner-fleet': paths.partnerFleet,
          'partner-scanner': paths.partnerScanner,
          'partner-manifest': paths.partnerManifest,
        }[screen];
        return go(target);
      }
    }
  }, [navigate, user, openProfile, refreshTickets, draft.trip, draft.event, draft.bookingId, digitalTicket]);
}

export { paths, screenFromPath };
