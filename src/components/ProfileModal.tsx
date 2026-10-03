import React from 'react';
import { UserRole, AppScreen } from '../types';
import { ASSETS } from '../data/mockData';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onNavigateScreen: (screen: AppScreen) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userRole,
  onSelectRole,
  onNavigateScreen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1c30]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-[#e2bfb0]/30 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-headline text-[16px] font-bold text-[#0b1c30]">
            Profil &amp; Mode d'accès
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#5a4136] hover:text-[#0b1c30] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff]">
          <img
            src={userRole === 'traveler' ? ASSETS.userAvatar : ASSETS.partnerAvatar}
            alt="Avatar"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#ff6b00]/30 flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-headline text-[15px] font-bold text-[#0b1c30] truncate">
              {userRole === 'traveler' ? 'Awa KOUASSI' : 'Agent Konan #AG-442'}
            </span>
            <span className="font-body text-[12px] text-[#5a4136]">
              {userRole === 'traveler' ? '+225 07 88 45 12 30' : 'Gare Centrale UTB Adjamé'}
            </span>
            <span className="font-headline text-[10px] text-[#00522e] font-bold uppercase flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[13px] fill">verified</span>
              {userRole === 'traveler' ? 'Compte Vérifié CI' : 'Contrôleur Officiel UTB'}
            </span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-col gap-2">
          <span className="font-headline text-[11px] uppercase tracking-wider text-[#5a4136] font-bold">
            Basculer d'environnement
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectRole('traveler');
                onNavigateScreen('explorer');
                onClose();
              }}
              className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer border ${
                userRole === 'traveler'
                  ? 'bg-[#ffdbcc]/40 border-[#ff6b00] ring-1 ring-[#ff6b00]'
                  : 'bg-white border-[#dce9ff] hover:bg-[#eff4ff]'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#ffdbcc] text-[#a04100] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <span className="font-headline text-[12px] font-bold text-[#0b1c30]">
                Espace Voyageur
              </span>
              <span className="font-body text-[10px] text-[#5a4136]">
                Recherche, Sièges, Paiement Wave, Pass
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectRole('partner');
                onNavigateScreen('partner-dashboard');
                onClose();
              }}
              className={`p-3 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer border ${
                userRole === 'partner'
                  ? 'bg-[#ffdbcc]/40 border-[#ff6b00] ring-1 ring-[#ff6b00]'
                  : 'bg-white border-[#dce9ff] hover:bg-[#eff4ff]'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#a5f0be] text-[#00522e] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <span className="font-headline text-[12px] font-bold text-[#0b1c30]">
                Espace UTB Pro
              </span>
              <span className="font-body text-[10px] text-[#5a4136]">
                Ventes, Scanner QR, Flotte &amp; Manifeste
              </span>
            </button>
          </div>
        </div>

        {/* Quick Screen Access Jump Menu */}
        <div className="flex flex-col gap-1.5">
          <span className="font-headline text-[11px] uppercase tracking-wider text-[#5a4136] font-bold">
            Accès direct aux écrans
          </span>
          <div className="grid grid-cols-2 gap-1.5 font-headline text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                onSelectRole('traveler');
                onNavigateScreen('explorer');
                onClose();
              }}
              className="p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-left truncate text-[#0b1c30] cursor-pointer"
            >
              1. 🚌 Explorer &amp; Recherche
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectRole('traveler');
                onNavigateScreen('seat-selection');
                onClose();
              }}
              className="p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-left truncate text-[#0b1c30] cursor-pointer"
            >
              2. 💺 Choix Sièges Car (41)
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectRole('traveler');
                onNavigateScreen('payment');
                onClose();
              }}
              className="p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-left truncate text-[#0b1c30] cursor-pointer"
            >
              3. ⚡ Paiement Mobile Money
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectRole('traveler');
                onNavigateScreen('digital-pass');
                onClose();
              }}
              className="p-2 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-left truncate text-[#0b1c30] cursor-pointer"
            >
              4. 📱 Pass Digital Sécurisé
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectRole('partner');
                onNavigateScreen('partner-scanner');
                onClose();
              }}
              className="p-2 rounded-xl bg-[#a5f0be]/40 hover:bg-[#a5f0be] text-left truncate text-[#00522e] cursor-pointer"
            >
              5. 📷 Scanner Contrôleur
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectRole('partner');
                onNavigateScreen('partner-manifest');
                onClose();
              }}
              className="p-2 rounded-xl bg-[#a5f0be]/40 hover:bg-[#a5f0be] text-left truncate text-[#00522e] cursor-pointer"
            >
              6. 📋 Manifeste Embarquement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
