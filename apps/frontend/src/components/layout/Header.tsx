import React from 'react';
import { type AppScreen, type AuthUser, type UserRole } from '@/types';

interface HeaderProps {
  currentScreen: AppScreen;
  userRole: UserRole;
  user: AuthUser | null;
  onNavigate: (screen: AppScreen) => void;
  onOpenProfile: () => void;
  backScreen?: AppScreen;
}

const screenTitles: Partial<Record<AppScreen, string>> = {
  'seat-selection': 'Choix des sièges',
  'event-selection': 'Choix des billets',
  'payment-result': 'Vérification du paiement',
  payment: 'Paiement',
  'digital-pass': 'Billet',
  'tickets-wallet': 'Mes billets',
  'partner-dashboard': 'Espace partenaire',
  'partner-scanner': 'Scanner de billets',
  'partner-manifest': 'Manifeste',
};

const subScreens: AppScreen[] = ['seat-selection', 'event-selection', 'payment', 'payment-result', 'digital-pass', 'partner-scanner'];

function initials(name: string): string {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

export const Header: React.FC<HeaderProps> = ({ currentScreen, userRole, user, onNavigate, onOpenProfile, backScreen }) => {
  const isSubScreen = subScreens.includes(currentScreen);
  const title = screenTitles[currentScreen];

  const goBack = () => {
    if (currentScreen === 'payment') onNavigate(backScreen || 'seat-selection');
    else if (currentScreen === 'partner-scanner') onNavigate('partner-manifest');
    else onNavigate('explorer');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#dce9ff] bg-[#f8f9ff]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          {isSubScreen && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Retour"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-[#0b1c30] hover:bg-[#eff4ff] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">arrow_back</span>
            </button>
          )}

          {title && isSubScreen ? (
            <p className="truncate font-headline text-[16px] font-bold text-[#0b1c30]">{title}</p>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(userRole === 'partner' ? 'partner-dashboard' : 'explorer')}
              className="flex min-w-0 items-baseline gap-2 rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              <span className="font-headline text-[18px] font-bold tracking-tight text-[#0b1c30]">
                TicketHub<span className="text-[#ff6b00]"> CI</span>
              </span>
              {userRole === 'partner' && title && <span className="truncate font-body text-[13px] text-[#5a4136]">{title}</span>}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          aria-label={user ? `Mon compte, ${user.fullName}` : 'Se connecter'}
          className="flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-lg border border-[#dce9ff] bg-white px-2 font-headline text-[13px] font-bold text-[#0b1c30] hover:bg-[#eff4ff] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
        >
          {user ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0b1c30] text-[12px] text-white" aria-hidden="true">{initials(user.fullName)}</span>
          ) : (
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">person</span>
          )}
          {!user && <span className="hidden sm:inline">Connexion</span>}
        </button>
      </div>
    </header>
  );
};
