import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { type AuthUser } from '@/types';
import { authApi } from '@/features/auth/api';
import { ticketsApi } from '@/features/tickets/api';
import { clearOfflineTickets } from '@/lib/offlineTickets';
import type { Account, SecurityStatus } from '@/services/api';

interface Credentials {
  fullName?: string;
  phone: string;
  password: string;
  partnerInviteCode?: string;
}

type Slots<T> = Record<Account, T | null>;

interface RawSession {
  ready: boolean;
  accounts: Slots<AuthUser>;
  securities: Slots<SecurityStatus>;
  setSecurity: (account: Account, security: SecurityStatus) => void;
  profileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  activeTicketCount: number;
  refreshTickets: () => void;
  /** Resolves with the signed-in user, or with a challenge when a second factor is still required. */
  authenticate: (mode: 'login' | 'register', credentials: Credentials) => Promise<{ user: AuthUser } | { challengeToken: string }>;
  verifyMfa: (challengeToken: string, code: string) => Promise<AuthUser>;
  logout: (account: Account) => Promise<void>;
}

const empty = (): Slots<never> => ({ traveler: null, partner: null });
const SessionContext = createContext<RawSession | null>(null);

/** A customer and a partner can be signed in at once; each has its own cookie and its own slot here. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Slots<AuthUser>>(empty());
  const [securities, setSecurities] = useState<Slots<SecurityStatus>>(empty());
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  const loadAccount = useCallback(async (account: Account) => {
    const session = await authApi.me(account).catch(() => ({ user: null, security: null }));
    setAccounts((current) => ({ ...current, [account]: session.user }));
    setSecurities((current) => ({ ...current, [account]: session.security }));
    return session;
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadAccount('traveler'), loadAccount('partner')]).then(([traveler]) => {
      if (!active) return;
      if (!traveler.user) void clearOfflineTickets();
      setReady(true);
    });
    return () => { active = false; };
  }, [loadAccount]);

  const traveler = accounts.traveler;
  useEffect(() => {
    if (!traveler) {
      setActiveTicketCount(0);
      return;
    }
    let active = true;
    ticketsApi.list()
      .then((tickets) => { if (active) setActiveTicketCount(tickets.filter((ticket) => ticket.status === 'active').length); })
      .catch(() => { if (active) setActiveTicketCount(0); });
    return () => { active = false; };
  }, [traveler, ticketRefreshKey]);

  const completeSignIn = useCallback(async (user: AuthUser) => {
    const account: Account = user.role === 'partner' ? 'partner' : 'traveler';
    setAccounts((current) => ({ ...current, [account]: user }));
    await loadAccount(account);
  }, [loadAccount]);

  const value = useMemo<RawSession>(() => ({
    ready,
    accounts,
    securities,
    setSecurity: (account, security) => setSecurities((current) => ({ ...current, [account]: security })),
    profileOpen,
    openProfile: () => setProfileOpen(true),
    closeProfile: () => setProfileOpen(false),
    activeTicketCount,
    refreshTickets: () => setTicketRefreshKey((key) => key + 1),
    async authenticate(mode, credentials) {
      if (mode === 'login') {
        const outcome = await authApi.login({ phone: credentials.phone, password: credentials.password });
        if (outcome.mfaRequired) return { challengeToken: outcome.challengeToken };
        await completeSignIn(outcome.user);
        return { user: outcome.user };
      }
      const registered = await authApi.register({
        fullName: credentials.fullName || '',
        phone: credentials.phone,
        password: credentials.password,
        partnerInviteCode: credentials.partnerInviteCode,
      });
      await completeSignIn(registered);
      return { user: registered };
    },
    async verifyMfa(challengeToken, code) {
      const verified = await authApi.loginMfa({ challengeToken, code });
      await completeSignIn(verified);
      return verified;
    },
    async logout(account) {
      await authApi.logout(account);
      // Cached tickets belong to the customer account that just left this device.
      if (account === 'traveler') await clearOfflineTickets();
      setAccounts((current) => ({ ...current, [account]: null }));
      setSecurities((current) => ({ ...current, [account]: null }));
    },
  }), [ready, accounts, securities, profileOpen, activeTicketCount, completeSignIn]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** The area of the site the person is looking at decides which of the two accounts is "the" current one. */
export function areaForPath(pathname: string): Account {
  return pathname === '/partenaire' || pathname.startsWith('/partenaire/') ? 'partner' : 'traveler';
}

export function useSession() {
  const raw = useContext(SessionContext);
  if (!raw) throw new Error('useSession must be used inside SessionProvider');
  const { pathname } = useLocation();
  const area = areaForPath(pathname);
  return {
    ...raw,
    area,
    /** Account of the current area: the partner in /partenaire, the customer everywhere else. */
    user: raw.accounts[area],
    security: raw.securities[area],
    hasPartnerAccount: raw.accounts.partner !== null,
  };
}
