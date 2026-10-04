import { Outlet, useNavigate } from 'react-router';
import { PartnerDashboardScreen } from '@/features/providers/pages/PartnerDashboardScreen';
import { PartnerScannerScreen } from '@/features/tickets/scanner/PartnerScannerScreen';
import { PartnerManifestScreen } from '@/features/tickets/pages/PartnerManifestScreen';
import { StatusPanel } from '@/components/feedback/StatusPanel';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { paths, useScreenNavigation } from '@/app/navigation';
import { useSession } from '@/app/session';

/**
 * Client side guard for the partner area. It only improves the experience: every partner API route still enforces
 * the role (and MFA enrolment) on the server.
 */
export function PartnerGuard() {
  const { ready, accounts, openProfile } = useSession();
  if (!ready) return <StatusPanel tone="loading" title="Vérification de votre session" />;
  if (!accounts.partner) return <UnauthorizedPage onSignIn={openProfile} />;
  return <Outlet />;
}

export function Dashboard() {
  return <PartnerDashboardScreen onNavigate={useScreenNavigation()} />;
}

export function Scanner() {
  const navigate = useNavigate();
  return <PartnerScannerScreen onNavigate={useScreenNavigation()} onBack={() => navigate(paths.partnerManifest)} />;
}

export function Manifest() {
  return <PartnerManifestScreen />;
}
