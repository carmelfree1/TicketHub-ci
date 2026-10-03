import React, { useState } from 'react';
import { AppScreen, AuthUser } from '../types';

interface Credentials {
  fullName?: string;
  phone: string;
  password: string;
  partnerInviteCode?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onAuthenticate: (mode: 'login' | 'register', credentials: Credentials) => Promise<void>;
  onLogout: () => Promise<void>;
  onNavigateScreen: (screen: AppScreen) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onAuthenticate,
  onLogout,
  onNavigateScreen,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [partnerInviteCode, setPartnerInviteCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      await onAuthenticate(mode, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        password,
        partnerInviteCode: partnerInviteCode.trim() || undefined,
      });
      setPassword('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible. Réessayez.');
    } finally {
      setIsBusy(false);
    }
  };

  const navigate = (screen: AppScreen) => {
    onNavigateScreen(screen);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0b1c30]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 border border-[#e2bfb0]/30 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="profile-modal-title" className="font-headline text-[16px] font-bold text-[#0b1c30]">
              {user ? 'Mon compte TicketHub' : 'Connexion / inscription'}
            </h2>
            <p className="font-body text-[11px] text-[#5a4136]">
              {user ? 'Profil et accès selon vos autorisations.' : 'Connectez-vous pour réserver et retrouver vos billets.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#5a4136] hover:text-[#0b1c30] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {user ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff]">
              <div className="w-12 h-12 rounded-full bg-[#ffdbcc] text-[#a04100] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[26px]">
                  {user.role === 'partner' ? 'badge' : 'person'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline text-[15px] font-bold text-[#0b1c30] truncate">{user.fullName}</span>
                <span className="font-body text-[12px] text-[#5a4136]">{user.phone}</span>
                <span className="font-headline text-[10px] text-[#00522e] font-bold uppercase mt-0.5">
                  {user.role === 'partner' ? 'Compte partenaire authentifié' : 'Compte voyageur'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(user.role === 'partner' ? 'partner-dashboard' : 'tickets-wallet')} className="p-3 rounded-2xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#dce9ff]">
                <span className="material-symbols-outlined text-[18px]">{user.role === 'partner' ? 'analytics' : 'confirmation_number'}</span>
                {user.role === 'partner' ? 'Espace partenaire' : 'Mes billets'}
              </button>
              <button type="button" onClick={() => navigate('explorer')} className="p-3 rounded-2xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#dce9ff]">
                <span className="material-symbols-outlined text-[18px]">explore</span>
                Explorer
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                setIsBusy(true);
                try {
                  await onLogout();
                  setError('');
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'Déconnexion impossible.');
                } finally {
                  setIsBusy(false);
                }
              }}
              disabled={isBusy}
              className="w-full py-2.5 rounded-xl bg-white border border-[#dce9ff] text-[#0b1c30] font-headline text-[13px] font-bold cursor-pointer disabled:opacity-60"
            >
              {isBusy ? 'Veuillez patienter…' : 'Se déconnecter'}
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#eff4ff] gap-1">
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`py-2 rounded-lg font-headline text-[12px] font-bold ${mode === 'login' ? 'bg-white shadow-xs text-[#0b1c30]' : 'text-[#5a4136]'}`}>Connexion</button>
              <button type="button" onClick={() => { setMode('register'); setError(''); }} className={`py-2 rounded-lg font-headline text-[12px] font-bold ${mode === 'register' ? 'bg-white shadow-xs text-[#0b1c30]' : 'text-[#5a4136]'}`}>Créer un compte</button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3">
              {mode === 'register' && (
                <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                  Nom complet
                  <input required minLength={2} maxLength={100} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]" placeholder="Awa KOUASSI" />
                </label>
              )}
              <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                Téléphone ivoirien
                <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]" placeholder="07 00 00 00 00" />
              </label>
              <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                Mot de passe
                <input required type="password" minLength={mode === 'register' ? 10 : 1} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#ff6b00]" placeholder={mode === 'register' ? '10 caractères minimum' : 'Votre mot de passe'} />
              </label>
              {mode === 'register' && (
                <details className="rounded-xl bg-[#eff4ff] px-3 py-2 border border-[#dce9ff]">
                  <summary className="font-headline text-[11px] font-bold text-[#0b1c30] cursor-pointer">Inscription partenaire</summary>
                  <label className="mt-2 flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                    Code d’invitation partenaire
                    <input value={partnerInviteCode} onChange={(event) => setPartnerInviteCode(event.target.value)} className="h-10 px-3 rounded-xl bg-white border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#216b43]" autoComplete="off" />
                  </label>
                </details>
              )}
              {error && <p role="alert" className="p-2.5 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[12px]">{error}</p>}
              <button disabled={isBusy} type="submit" className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[13px] font-bold cursor-pointer disabled:opacity-60">
                {isBusy ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
              <p className="font-body text-[10px] text-center text-[#5a4136]">Vos données de connexion sont envoyées uniquement à l’API TicketHub.</p>
            </form>
          </>
        )}

      </section>
    </div>
  );
};
