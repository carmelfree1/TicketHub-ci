import { Link, useNavigate, useParams } from 'react-router';
import { DigitalPassScreen } from '@/features/tickets/pages/DigitalPassScreen';
import { ticketsApi } from '@/features/tickets/api';
import { StatusPanel, primaryActionClass } from '@/components/feedback/StatusPanel';
import { useAsyncValue } from '@/hooks/useAsyncValue';
import { ApiError } from '@/services/api';
import { toDigitalTicket } from '@/services/ticketMapper';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';
import { useSession } from '@/app/session';

export function Component() {
  const { ticketCode = '' } = useParams();
  const navigate = useNavigate();
  const flow = useBookingFlow();
  const { ready, user, openProfile } = useSession();

  const known = flow.digitalTicket?.ticketCode === ticketCode ? flow.digitalTicket : null;
  const lookup = useAsyncValue(
    async () => {
      if (known) return known;
      const ticket = (await ticketsApi.list()).find((candidate) => candidate.ticketCode === ticketCode);
      return ticket ? toDigitalTicket(ticket) : undefined;
    },
    `${ticketCode}:${ready ? user?.id ?? 'anonymous' : 'pending'}`,
  );

  if (!ready || lookup.status === 'loading') return <StatusPanel tone="loading" title="Chargement du billet" />;

  const signedOut = lookup.status === 'error' && lookup.error instanceof ApiError && lookup.error.status === 401;
  if (signedOut) {
    return (
      <StatusPanel
        tone="info"
        icon="lock"
        title="Connexion requise"
        description="Connectez-vous avec le compte qui a acheté ce billet pour l’afficher."
        actions={<button type="button" onClick={openProfile} className={primaryActionClass}>Se connecter</button>}
      />
    );
  }
  if (lookup.status === 'error') {
    return (
      <StatusPanel
        tone="error"
        title="Billet indisponible"
        description="Impossible de charger ce billet. Vérifiez votre connexion puis réessayez."
        actions={<button type="button" onClick={lookup.retry} className={primaryActionClass}>Réessayer</button>}
      />
    );
  }
  if (lookup.status === 'missing') {
    return (
      <StatusPanel
        tone="empty"
        title="Billet introuvable"
        description="Ce billet n’existe pas sur votre compte."
        actions={<Link to={paths.wallet} className={primaryActionClass}>Mes billets</Link>}
      />
    );
  }

  return <DigitalPassScreen ticket={lookup.value} onBackToExplorer={() => navigate(paths.home)} />;
}
