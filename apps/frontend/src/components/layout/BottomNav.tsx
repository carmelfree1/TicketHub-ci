import React from 'react';
import { type AppScreen, type UserRole } from '@/types';

interface BottomNavProps {
  currentScreen: AppScreen;
  userRole: UserRole;
  onNavigate: (screen: AppScreen) => void;
  onOpenProfile: () => void;
  activeTicketCount?: number;
}

interface Item {
  label: string;
  icon: string;
  screen?: AppScreen;
  onSelect?: () => void;
  badge?: number;
}

// Checkout and ticket display are full focus flows: no navigation competes with the primary action.
const focusScreens: AppScreen[] = ['payment', 'payment-result', 'digital-pass', 'event-selection', 'seat-selection'];

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, userRole, onNavigate, onOpenProfile, activeTicketCount = 0 }) => {
  if (focusScreens.includes(currentScreen)) return null;

  const items: Item[] =
    userRole === 'partner'
      ? [
          { label: 'Accueil', icon: 'dashboard', screen: 'partner-dashboard' },
          { label: 'Manifeste', icon: 'list_alt', screen: 'partner-manifest' },
          { label: 'Scanner', icon: 'qr_code_scanner', screen: 'partner-scanner' },
          { label: 'Catalogue', icon: 'explore', screen: 'explorer' },
          { label: 'Compte', icon: 'person', onSelect: onOpenProfile },
        ]
      : [
          { label: 'Catalogue', icon: 'explore', screen: 'explorer' },
          { label: 'Billets', icon: 'confirmation_number', screen: 'tickets-wallet', badge: activeTicketCount },
          { label: 'Compte', icon: 'person', onSelect: onOpenProfile },
        ];

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce9ff] bg-[#f8f9ff]/95 backdrop-blur">
      <ul className="mx-auto flex h-16 w-full max-w-[1440px] items-stretch justify-around px-2 sm:px-6 lg:px-8">
        {items.map((item) => {
          const active = item.screen === currentScreen;
          return (
            <li key={item.label} className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => (item.onSelect ? item.onSelect() : item.screen && onNavigate(item.screen))}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-[44px] w-full max-w-[96px] flex-col items-center justify-center gap-0.5 rounded-lg font-body text-[11px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2410c] ${
                  active ? 'font-bold text-[#a04100]' : 'text-[#4a5568] hover:text-[#0b1c30]'
                }`}
              >
                <span className="relative">
                  <span className={`material-symbols-outlined text-[24px] ${active ? 'fill' : ''}`} aria-hidden="true">{item.icon}</span>
                  {item.badge ? (
                    <span className="absolute -right-2.5 -top-1 min-w-[18px] rounded-md bg-[#c2410c] px-1 font-headline text-[10px] font-bold leading-[18px] text-white">
                      <span aria-hidden="true">{item.badge}</span>
                      <span className="sr-only">{item.badge} billets actifs</span>
                    </span>
                  ) : null}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
