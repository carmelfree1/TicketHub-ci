import React from 'react';
import { AppScreen, UserRole } from '../types';

interface BottomNavProps {
  currentScreen: AppScreen;
  userRole: UserRole;
  onNavigate: (screen: AppScreen) => void;
  activeTicketCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  userRole,
  onNavigate,
  activeTicketCount = 2,
}) => {
  // If in payment or digital pass full-focus flow, do not show bottom navigation bar to keep checkout clean
  if (currentScreen === 'payment' || currentScreen === 'payment-result' || currentScreen === 'digital-pass' || currentScreen === 'event-selection') {
    return null;
  }

  if (userRole === 'partner') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f8f9ff]/95 backdrop-blur-xl border-t border-[#dce9ff] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
          {/* 1. Ventes */}
          <button
            onClick={() => onNavigate('partner-dashboard')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
              currentScreen === 'partner-dashboard'
                ? 'text-[#a04100] font-bold scale-105'
                : 'text-[#565e74] hover:text-[#a04100]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                currentScreen === 'partner-dashboard' ? 'fill' : ''
              }`}
            >
              analytics
            </span>
            <span className="font-body text-[11px] leading-tight">Ventes</span>
          </button>

          {/* 2. Trajets */}
          <button
            onClick={() => onNavigate('partner-fleet')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
              currentScreen === 'partner-fleet'
                ? 'text-[#a04100] font-bold scale-105'
                : 'text-[#565e74] hover:text-[#a04100]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                currentScreen === 'partner-fleet' ? 'fill' : ''
              }`}
            >
              directions_bus
            </span>
            <span className="font-body text-[11px] leading-tight">Trajets</span>
          </button>

          {/* 3. Central Scanner Trigger Button */}
          <div className="flex items-center justify-center -mt-5">
            <button
              onClick={() => onNavigate('partner-scanner')}
              aria-label="Scanner de billets QR"
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#a04100] to-[#ff6b00] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(255,107,0,0.38)] active:scale-95 transition-transform cursor-pointer ring-4 ring-[#f8f9ff]"
            >
              <span className="material-symbols-outlined text-[28px]">qr_code_scanner</span>
            </button>
          </div>

          {/* 4. Commandes & Manifeste */}
          <button
            onClick={() => onNavigate('partner-manifest')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-all gap-0.5 cursor-pointer ${
              currentScreen === 'partner-manifest'
                ? 'text-[#a04100] font-bold scale-105'
                : 'text-[#565e74] hover:text-[#a04100]'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                currentScreen === 'partner-manifest' ? 'fill' : ''
              }`}
            >
              confirmation_number
            </span>
            <span className="font-body text-[11px] leading-tight">Commandes</span>
          </button>

          {/* 5. Switcher back to Traveler mode */}
          <button
            onClick={() => onNavigate('explorer')}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#565e74] hover:text-[#a04100] transition-colors gap-0.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
            <span className="font-body text-[11px] leading-tight">Voyageur</span>
          </button>
        </div>
      </nav>
    );
  }

  // Traveler Bottom Nav
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f8f9ff]/95 backdrop-blur-xl border-t border-[#dce9ff] shadow-[0_-2px_12px_rgba(11,28,48,0.05)]">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
        {/* Explorer */}
        <button
          onClick={() => onNavigate('explorer')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-all cursor-pointer ${
            currentScreen === 'explorer'
              ? 'text-[#ff6b00] font-bold scale-105'
              : 'text-[#5a4136] hover:text-[#0b1c30]'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[24px] ${
              currentScreen === 'explorer' ? 'fill' : ''
            }`}
          >
            explore
          </span>
          <span className="font-body text-[11px] mt-0.5">Explorer</span>
        </button>

        {/* Billets with dynamic badge */}
        <button
          onClick={() => onNavigate('tickets-wallet')}
          className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-all cursor-pointer ${
            currentScreen === 'tickets-wallet'
              ? 'text-[#ff6b00] font-bold scale-105'
              : 'text-[#5a4136] hover:text-[#0b1c30]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-[24px] ${
                currentScreen === 'tickets-wallet' ? 'fill' : ''
              }`}
            >
              confirmation_number
            </span>
            {activeTicketCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#ff6b00] text-white font-headline text-[10px] leading-4 flex items-center justify-center font-bold shadow-xs">
                {activeTicketCount}
              </span>
            )}
          </div>
          <span className="font-body text-[11px] mt-0.5">Billets</span>
        </button>

        {/* Favoris */}
        <button
          onClick={() => onNavigate('explorer')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[#5a4136] hover:text-[#0b1c30] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">favorite</span>
          <span className="font-body text-[11px] mt-0.5">Favoris</span>
        </button>

        {/* Alertes */}
        <button
          onClick={() => onNavigate('explorer')}
          className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[#5a4136] hover:text-[#0b1c30] transition-colors cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#216b43]"></span>
          </div>
          <span className="font-body text-[11px] mt-0.5">Alertes</span>
        </button>

        {/* Compte */}
        <button
          onClick={() => onNavigate('partner-dashboard')}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-[#5a4136] hover:text-[#ff6b00] transition-colors cursor-pointer"
          title="Basculer vers Espace Pro UTB"
        >
          <span className="material-symbols-outlined text-[24px]">account_circle</span>
          <span className="font-body text-[11px] mt-0.5">Compte</span>
        </button>
      </div>
    </nav>
  );
};
