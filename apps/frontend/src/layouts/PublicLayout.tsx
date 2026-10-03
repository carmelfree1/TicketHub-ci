import type { ReactNode } from 'react';

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#fbf9f6] text-[#0b1c30]">{children}</div>;
}
