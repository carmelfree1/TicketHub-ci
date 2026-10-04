import React from 'react';
import { type AppScreen, type UserRole } from '@/types';
import { ASSETS } from '@/lib/assets';

interface HeaderProps {
  currentScreen: AppScreen;
  userRole: UserRole;
  onNavigate: (screen: AppScreen) => void;
  onOpenProfile: () => void;
  backScreen?: AppScreen;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  userRole,
  onNavigate,
  onOpenProfile,
  backScreen,
}) => {
  const isSubScreen =
    currentScreen === 'seat-selection' ||
    currentScreen === 'event-selection' ||
    currentScreen === 'payment' ||
    currentScreen === 'payment-result' ||
    currentScreen === 'digital-pass' ||
    currentScreen === 'partner-scanner';

  const handleBack = () => {
    if (currentScreen === 'seat-selection' || currentScreen === 'event-selection' || currentScreen === 'payment-result') onNavigate('explorer');
    else if (currentScreen === 'payment') onNavigate(backScreen || 'seat-selection');
    else if (currentScreen === 'digital-pass') onNavigate('explorer');
    else if (currentScreen === 'partner-scanner') onNavigate('partner-fleet');
    else onNavigate('explorer');
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'explorer':
        return null;
      case 'seat-selection':
        return 'Sélection Des Sièges';
      case 'event-selection':
        return 'Billets événementiels';
      case 'payment-result':
        return 'Vérification paiement';
      case 'payment':
        return 'Paiement Mobile Money';
      case 'digital-pass':
        return 'Pass Digital';
      case 'tickets-wallet':
        return 'Mes Billets';
      case 'partner-dashboard':
        return 'Dashboard Ventes';
      case 'partner-fleet':
        return 'Trajets & Offres';
      case 'partner-scanner':
        return 'Scanner QR Contrôleur';
      case 'partner-manifest':
        return 'Commandes & Billets';
      default:
        return 'TicketHub CI';
    }
  };

  const title = getScreenTitle();

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-[#e2bfb0]/30 shadow-[0_1px_8px_rgba(11,28,48,0.04)]">
      <div className="mx-auto h-16 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Left Side: Back button or Logo + Title */}
        <div className="flex items-center gap-2 min-w-0">
          {isSubScreen ? (
            <button
              onClick={handleBack}
              aria-label="Retour"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#0b1c30] hover:bg-[#eff4ff] active:scale-95 transition-all -ml-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ) : null}

          {userRole === 'traveler' ? (
            <div
              onClick={() => onNavigate('explorer')}
              className="flex items-center gap-2 cursor-pointer select-none min-w-0"
            >
              <img
                src={ASSETS.logo}
                alt="TicketHub CI Logo"
                className="h-7 w-auto object-contain flex-shrink-0"
              />
              {currentScreen === 'explorer' ? (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-headline text-[17px] font-bold tracking-tight text-[#ff6b00] leading-none">
                      TicketHub
                    </span>
                    <span className="font-body text-[10px] px-1.5 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-bold leading-none">
                      CI
                    </span>
                  </div>
                  <span className="font-body text-[11px] text-[#5a4136] leading-tight">
                    L'Agrégateur Officiel
                  </span>
                </div>
              ) : (
                <h1 className="font-headline text-[16px] text-[#0b1c30] font-bold truncate">
                  {title}
                </h1>
              )}
            </div>
          ) : (
            /* Partner Mode Header */
            <div
              onClick={() => onNavigate('partner-dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none min-w-0"
            >
              <img
                src={ASSETS.partnerLogo}
                alt="UTB Partner Pro"
                className="h-8 w-auto object-contain flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-body text-[11px] uppercase tracking-wider text-[#a04100] font-bold">
                    Partner Pro
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-body text-[9px] font-bold">
                    UTB PRO
                  </span>
                </div>
                <h1 className="font-headline text-[15px] font-bold text-[#0b1c30] truncate">
                  {title || 'Dashboard Ventes'}
                </h1>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Location or Mode Switcher & Profile Avatar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {userRole === 'traveler' && currentScreen === 'explorer' && (
            <div className="hidden sm:flex h-8 px-2.5 rounded-full bg-[#eff4ff] items-center gap-1.5 border border-[#dce9ff] text-[12px] font-semibold text-[#0b1c30] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#216b43] animate-pulse"></span>
              <span>Abidjan 🇨🇮</span>
            </div>
          )}

          {userRole === 'partner' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#eff4ff] text-[#5a4136] font-body text-[10px] font-bold border border-[#dce9ff]">
              Gare Adjamé
            </span>
          )}

          <button
            onClick={onOpenProfile}
            title="Options de profil et changement de mode"
            className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#ff6b00]/30 hover:ring-[#ff6b00] active:scale-95 transition-all cursor-pointer shadow-xs flex-shrink-0"
          >
            <img
              src={userRole === 'traveler' ? ASSETS.userAvatar : ASSETS.partnerAvatar}
              alt="Profil"
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
