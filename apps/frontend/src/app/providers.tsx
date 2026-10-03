import type { ReactNode } from 'react';

/** Central composition point for app-wide contexts (currently the app uses no global store). */
export function AppProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
