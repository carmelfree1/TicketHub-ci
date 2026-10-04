import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type AuthUser } from '@/types';
import { authApi } from '@/features/auth/api';
import { ticketsApi } from '@/features/tickets/api';
import { clearOfflineTickets } from '@/lib/offlineTickets';
import type { SecurityStatus } from '@/services/api';

interface Credentials {
  fullName?: string;
  phone: string;
  password: string;
  partnerInviteCode?: string;
}

interface SessionValue {
  /** False until the first /auth/me answer, so route guards do not redirect before the session is known. */
  ready: boolean;
  user: AuthUser | null;
  security: SecurityStatus | null;
  setSecurity: (security: SecurityStatus) => void;
  profileOpen: boolean;
  openProfile: () => void;
  closeProfile: () => void;
  activeTicketCount: number;
  refreshTickets: () => void;
  /** Resolves with the signed-in user, or with a challenge when a second factor is still required. */
  authenticate: (mode: 'login' | 'register', credentials: Credentials) => Promise<{ user: AuthUser } | { challengeToken: string }>;
  verifyMfa: (challengeToken: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then((session) => {
        if (!active) return;
        setUser(session.user);
        setSecurity(session.security);
        if (!session.user) void clearOfflineTickets();
      })
      .catch(() => { if (active) { setUser(null); setSecurity(null); } })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'traveler') {
      setActiveTicketCount(0);
      return;
    }
    let active = true;
    ticketsApi.list()
      .then((tickets) => { if (active) setActiveTicketCount(tickets.filter((ticket) => ticket.status === 'active').length); })
      .catch(() => { if (active) setActiveTicketCount(0); });
    return () => { active = false; };
  }, [user, ticketRefreshKey]);

  const completeSignIn = useCallback(async (next: AuthUser) => {
    setUser(next);
    setSecurity((await authApi.me().catch(() => null))?.security ?? null);
  }, []);

  const value = useMemo<SessionValue>(() => ({
    ready,
    user,
    security,
    setSecurity,
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
    async logout() {
      await authApi.logout();
      // Cached tickets belong to the account that just left this device.
      await clearOfflineTickets();
      setUser(null);
      setSecurity(null);
    },
  }), [ready, user, security, profileOpen, activeTicketCount, completeSignIn]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
