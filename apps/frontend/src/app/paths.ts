import type { AppScreen } from '@tickethub/types';

/** Static URLs. Screens that depend on a selection (trip, event, ticket) are resolved in `useScreenNavigation`. */
export const paths = {
  home: '/',
  trip: (tripId: string) => `/trajets/${encodeURIComponent(tripId)}`,
  event: (eventId: string) => `/evenements/${encodeURIComponent(eventId)}`,
  payment: '/paiement',
  paymentReturn: '/paiement/retour',
  wallet: '/billets',
  ticket: (ticketCode: string) => `/billets/${encodeURIComponent(ticketCode)}`,
  partner: '/partenaire',
  partnerScanner: '/partenaire/scanner',
  partnerManifest: '/partenaire/manifeste',
} as const;

/** Which of the legacy `AppScreen` names the current URL corresponds to; drives Header and BottomNav highlighting. */
export function screenFromPath(pathname: string): AppScreen | null {
  if (pathname === '/') return 'explorer';
  if (pathname.startsWith('/trajets/')) return 'seat-selection';
  if (pathname.startsWith('/evenements/')) return 'event-selection';
  if (pathname === paths.paymentReturn) return 'payment-result';
  if (pathname === paths.payment) return 'payment';
  if (pathname.startsWith('/billets/')) return 'digital-pass';
  if (pathname === paths.wallet) return 'tickets-wallet';
  if (pathname === paths.partner) return 'partner-dashboard';
  if (pathname === paths.partnerScanner) return 'partner-scanner';
  if (pathname === paths.partnerManifest) return 'partner-manifest';
  return null;
}
