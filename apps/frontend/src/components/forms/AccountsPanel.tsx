import { useState } from 'react';
import { type AppScreen, type AuthUser } from '@/types';
import type { Account, SecurityStatus } from '@/services/api';
import { MfaSettings } from './MfaSettings';

interface AccountsPanelProps {
  accounts: Record<Account, AuthUser | null>;
  securities: Record<Account, SecurityStatus | null>;
  /** The account of the part of the site currently open; shown first. */
  area: Account;
  onSecurityChange: (account: Account, security: SecurityStatus) => void;
  onLogout: (account: Account) => Promise<void>;
  onNavigate: (screen: AppScreen) => void;
  onSignInAs: (account: Account) => void;
}

const labels: Record<Account, { title: string; icon: string; open: string; openIcon: string; screen: AppScreen; signIn: string }> = {
  traveler: { title: 'Compte client', icon: 'person', open: 'Mes billets', openIcon: 'confirmation_number', screen: 'tickets-wallet', signIn: 'Se connecter avec un compte client' },
  partner: { title: 'Compte partenaire', icon: 'badge', open: 'Espace partenaire', openIcon: 'analytics', screen: 'partner-dashboard', signIn: 'Se connecter avec un compte partenaire' },
};

const buttonClass =
  'min-h-[44px] rounded-xl bg-[#eff4ff] px-3 font-headline text-[12px] font-bold text-[#0b1c30] hover:bg-[#dce9ff] cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2410c]';

/** Both accounts at once: each can be opened, secured or signed out without affecting the other. */
export function AccountsPanel({ accounts, securities, area, onSecurityChange, onLogout, onNavigate, onSignInAs }: AccountsPanelProps) {
  const [busy, setBusy] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const order: Account[] = area === 'partner' ? ['partner', 'traveler'] : ['traveler', 'partner'];

  const signOut = async (account: Account) => {
    setError('');
    setBusy(account);
    try {
      await onLogout(account);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Déconnexion impossible.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {order.map((account) => {
        const user = accounts[account];
        const label = labels[account];
        if (!user) {
          return (
            <section key={account} aria-label={label.title} className="rounded-2xl border border-dashed border-[#c9d7ff] p-3">
              <h3 className="font-headline text-[13px] font-bold text-[#0b1c30]">{label.title}</h3>
              <p className="mt-0.5 font-body text-[12px] text-[#5a4136]">Non connecté.</p>
              <button type="button" onClick={() => onSignInAs(account)} className={`${buttonClass} mt-2 w-full`}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
                {label.signIn}
              </button>
            </section>
          );
        }
        return (
          <section key={account} aria-label={label.title} className={`flex flex-col gap-2 rounded-2xl border p-3 ${account === area ? 'border-[#c2410c]' : 'border-[#dce9ff]'}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0b1c30] text-white" aria-hidden="true">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{label.icon}</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-headline text-[10px] font-bold uppercase text-[#00522e]">{label.title}</span>
                <span className="truncate font-headline text-[15px] font-bold text-[#0b1c30]">{user.fullName}</span>
                <span className="font-body text-[12px] text-[#5a4136]">{user.phone}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onNavigate(label.screen)} className={buttonClass}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{label.openIcon}</span>
                {label.open}
              </button>
              <button
                type="button"
                onClick={() => void signOut(account)}
                disabled={busy !== null}
                aria-label={`Se déconnecter du ${label.title.toLowerCase()}`}
                className="min-h-[44px] rounded-xl border border-[#dce9ff] bg-white px-3 font-headline text-[12px] font-bold text-[#0b1c30] hover:bg-[#eff4ff] disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2410c]"
              >
                {busy === account ? 'Patientez…' : 'Se déconnecter'}
              </button>
            </div>
            <MfaSettings account={account} security={securities[account]} onChange={(next) => onSecurityChange(account, next)} />
          </section>
        );
      })}
      {error && <p role="alert" className="rounded-xl bg-[#ffdad6] p-2.5 font-body text-[12px] text-[#93000a]">{error}</p>}
    </div>
  );
}
