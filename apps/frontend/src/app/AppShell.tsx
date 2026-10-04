import { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { StatusPanel } from '@/components/feedback/StatusPanel';
import { AppStatusBanners } from '@/components/layout/AppStatusBanners';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { usePageMeta } from './usePageMeta';
import { paths, useCurrentScreen, useScreenNavigation } from './navigation';
import { useBookingFlow } from './booking-flow';
import { useSession } from './session';

export function AppShell() {
  const navigate = useNavigate();
  const screen = useCurrentScreen();
  const goToScreen = useScreenNavigation();
  const session = useSession();
  const { draft, reset } = useBookingFlow();
  usePageMeta();

  return (
    <div className="min-h-screen bg-[#eef3ff] text-[#0b1c30]">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-headline focus:text-[13px] focus:font-bold focus:shadow-lg"
      >
        Aller au contenu
      </a>
      <div className="mx-auto w-full min-h-screen max-w-[1440px] flex flex-col bg-[#f8f9ff] relative lg:border-x lg:border-[#dce9ff]">
        <Header
          currentScreen={screen}
          userRole={session.area}
          user={session.user}
          onNavigate={goToScreen}
          onOpenProfile={session.openProfile}
          backScreen={draft.event ? 'event-selection' : 'seat-selection'}
        />

        <main id="contenu" tabIndex={-1} className="flex-1 w-full pt-16 focus:outline-none">
          <AppStatusBanners />
          <Suspense fallback={<StatusPanel tone="loading" title="Chargement" />}>
            <Outlet />
          </Suspense>
          <SiteFooter />
        </main>

        <BottomNav
          currentScreen={screen}
          userRole={session.area}
          partnerAvailable={session.hasPartnerAccount}
          onNavigate={goToScreen}
          onOpenProfile={session.openProfile}
          activeTicketCount={session.activeTicketCount}
        />

        <ProfileModal
          isOpen={session.profileOpen}
          onClose={session.closeProfile}
          accounts={session.accounts}
          securities={session.securities}
          area={session.area}
          onSecurityChange={session.setSecurity}
          onAuthenticate={async (mode, credentials) => {
            const outcome = await session.authenticate(mode, credentials);
            if ('challengeToken' in outcome) return { challengeToken: outcome.challengeToken };
            if (outcome.user.role === 'partner') navigate(paths.partner);
          }}
          onVerifyMfa={async (challengeToken, code) => {
            const user = await session.verifyMfa(challengeToken, code);
            if (user.role === 'partner') navigate(paths.partner);
          }}
          onLogout={async (account) => {
            await session.logout(account);
            if (account === 'traveler') reset();
            // Signing out of the account of the area you are in leaves that area; the other account stays signed in.
            if (account === session.area) navigate(paths.home);
          }}
          onNavigateScreen={goToScreen}
        />
      </div>
    </div>
  );
}
