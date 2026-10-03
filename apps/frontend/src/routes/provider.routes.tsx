import type { AppScreen } from '@/types';

export const providerRoutes = [
  'partner-dashboard', 'partner-fleet', 'partner-scanner', 'partner-manifest',
] as const satisfies readonly AppScreen[];
