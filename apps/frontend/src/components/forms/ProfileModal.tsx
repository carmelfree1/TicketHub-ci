import React, { useState } from 'react';
import { Link } from 'react-router';
import { type AppScreen, type AuthUser } from '@/types';
import type { Account, SecurityStatus } from '@/services/api';
import { AccountsPanel } from './AccountsPanel';

interface Credentials {
  fullName?: string;
  phone: string;
  password: string;
  partnerInviteCode?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Record<Account, AuthUser | null>;
  securities: Record<Account, SecurityStatus | null>;
  area: Account;
  onSecurityChange: (account: Account, security: SecurityStatus) => void;
  onAuthenticate: (mode: 'login' | 'register', credentials: Credentials) => Promise<{ challengeToken: string } | void>;
  onVerifyMfa: (challengeToken: string, code: string) => Promise<void>;
  onLogout: (account: Account) => Promise<void>;
  onNavigateScreen: (screen: AppScreen) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  accounts,
  securities,
  area,
  onSecurityChange,
  onAuthenticate,
  onVerifyMfa,
  onLogout,
  onNavigateScreen,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [partnerInviteCode, setPartnerInviteCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [addingAccount, setAddingAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');

  const hasAnyAccount = accounts.traveler !== null || accounts.partner !== null;
  const showAccounts = hasAnyAccount && addingAccount === null && !challengeToken;

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      const outcome = await onAuthenticate(mode, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        password,
        partnerInviteCode: partnerInviteCode.trim() || undefined,
      });
      setPassword('');
      if (outcome) {
        setChallengeToken(outcome.challengeToken);
        return;
      }
      setAddingAccount(null);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible. Réessayez.');
    } finally {
      setIsBusy(false);
    }
  };

  const submitMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      await onVerifyMfa(challengeToken, mfaCode.trim());
      setChallengeToken('');
      setMfaCode('');
      setAddingAccount(null);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Vérification impossible. Réessayez.');
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
              {hasAnyAccount && addingAccount === null ? 'Mes comptes TicketHub' : addingAccount === 'partner' ? 'Compte partenaire' : addingAccount === 'traveler' ? 'Compte client' : 'Connexion / inscription'}
            </h2>
            <p className="font-body text-[11px] text-[#5a4136]">
              {hasAnyAccount && addingAccount === null ? 'Vous pouvez être connecté en même temps comme client et comme partenaire.' : 'Connectez-vous pour réserver et retrouver vos billets.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#5a4136] hover:text-[#0b1c30] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>

        {showAccounts ? (
          <AccountsPanel
            accounts={accounts}
            securities={securities}
            area={area}
            onSecurityChange={onSecurityChange}
            onLogout={onLogout}
            onNavigate={navigate}
            onSignInAs={(account) => { setAddingAccount(account); setMode('login'); setError(''); }}
          />
        ) : challengeToken ? (
          <form onSubmit={submitMfa} className="flex flex-col gap-3">
            <p className="font-body text-[12px] text-[#0b1c30]">
              Entrez le code à 6 chiffres de votre application d’authentification, ou l’un de vos codes de secours.
            </p>
            <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
              Code de vérification
              <input
                required
                autoFocus
                autoComplete="one-time-code"
                maxLength={16}
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2410c]"
              />
            </label>
            {error && <p role="alert" className="p-2.5 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[12px]">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setChallengeToken(''); setMfaCode(''); setError(''); }} className="min-h-[46px] rounded-xl bg-white border border-[#dce9ff] text-[#0b1c30] font-headline text-[13px] font-bold cursor-pointer">Retour</button>
              <button disabled={isBusy || mfaCode.trim().length < 6} type="submit" className="min-h-[46px] rounded-xl bg-[#c2410c] text-white font-headline text-[13px] font-bold cursor-pointer disabled:opacity-60">
                {isBusy ? 'Vérification…' : 'Vérifier'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {hasAnyAccount && (
              <button type="button" onClick={() => { setAddingAccount(null); setChallengeToken(''); setError(''); }} className="self-start font-headline text-[12px] font-bold text-[#a04100] underline cursor-pointer">
                Retour à mes comptes
              </button>
            )}
            {addingAccount === 'partner' && (
              <p className="font-body text-[12px] text-[#5a4136]">Connectez-vous avec votre compte partenaire. Votre compte client reste connecté.</p>
            )}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#eff4ff] gap-1">
              <button type="button" onClick={() => { setMode('login'); setError(''); }} className={`py-2 rounded-lg font-headline text-[12px] font-bold ${mode === 'login' ? 'bg-white shadow-xs text-[#0b1c30]' : 'text-[#5a4136]'}`}>Connexion</button>
              <button type="button" onClick={() => { setMode('register'); setError(''); }} className={`py-2 rounded-lg font-headline text-[12px] font-bold ${mode === 'register' ? 'bg-white shadow-xs text-[#0b1c30]' : 'text-[#5a4136]'}`}>Créer un compte</button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3">
              {mode === 'register' && (
                <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                  Nom complet
                  <input required minLength={2} maxLength={100} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2410c]" placeholder="Awa KOUASSI" />
                </label>
              )}
              <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                Téléphone ivoirien
                <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2410c]" placeholder="07 00 00 00 00" />
              </label>
              <label className="flex flex-col gap-1 font-headline text-[11px] font-bold text-[#0b1c30]">
                Mot de passe
                <input required type="password" minLength={mode === 'register' ? 10 : 1} maxLength={128} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff] font-body text-[14px] focus:outline-none focus:ring-2 focus:ring-[#c2410c]" placeholder={mode === 'register' ? '10 caractères minimum' : 'Votre mot de passe'} />
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
              {mode === 'register' && (
                <label className="flex items-start gap-2 font-body text-[12px] leading-snug text-[#0b1c30]">
                  <input type="checkbox" required checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#ff6b00]" />
                  <span>
                    J’ai lu et j’accepte les <Link to="/conditions" onClick={onClose} className="font-bold text-[#a04100] underline">conditions d’utilisation</Link> et la{' '}
                    <Link to="/confidentialite" onClick={onClose} className="font-bold text-[#a04100] underline">politique de confidentialité</Link>.
                  </span>
                </label>
              )}
              {error && <p role="alert" className="p-2.5 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[12px]">{error}</p>}
              <button disabled={isBusy || (mode === 'register' && !acceptedTerms)} type="submit" className="w-full min-h-[46px] rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-headline text-[13px] font-bold cursor-pointer disabled:opacity-60">
                {isBusy ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>
          </>
        )}

      </section>
    </div>
  );
};
