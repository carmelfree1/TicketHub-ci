import type { ReactNode } from 'react';
import { BookingFlowProvider } from './booking-flow';
import { SessionProvider } from './session';

/** Central composition point for app-wide state. Order matters: navigation hooks read both contexts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <BookingFlowProvider>{children}</BookingFlowProvider>
    </SessionProvider>
  );
}
