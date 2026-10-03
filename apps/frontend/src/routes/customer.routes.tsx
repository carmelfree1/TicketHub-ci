import type { AppScreen } from '@/types';

export const customerRoutes = [
  'seat-selection', 'event-selection', 'payment', 'payment-result', 'digital-pass', 'tickets-wallet',
] as const satisfies readonly AppScreen[];
