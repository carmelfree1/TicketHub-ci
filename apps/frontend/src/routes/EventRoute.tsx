import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { type TicketCategory } from '@/types';
import { EventTicketSelectionScreen } from '@/features/booking/pages/EventTicketSelectionScreen';
import { bookingApi } from '@/features/booking/api';
import { catalogApi } from '@/features/catalog/api';
import { StatusPanel, primaryActionClass } from '@/components/feedback/StatusPanel';
import { useAsyncValue } from '@/hooks/useAsyncValue';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';
import { useSession } from '@/app/session';

export function Component() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const flow = useBookingFlow();
  const { user, openProfile } = useSession();
  const [isBooking, setIsBooking] = useState(false);
  const [actionError, setActionError] = useState('');

  const known = flow.draft.event?.id === eventId ? flow.draft.event : null;
  const lookup = useAsyncValue(
    async () => known ?? (await catalogApi.events()).find((candidate) => candidate.id === eventId),
    eventId,
  );

  if (lookup.status === 'loading') return <StatusPanel tone="loading" title="Chargement de l’événement" />;
  if (lookup.status === 'error') {
    return (
      <StatusPanel
        tone="error"
        title="Événement indisponible"
        description="Impossible de charger cet événement. Vérifiez votre connexion puis réessayez."
        actions={<button type="button" onClick={lookup.retry} className={primaryActionClass}>Réessayer</button>}
      />
    );
  }
  if (lookup.status === 'missing') {
    return (
      <StatusPanel
        tone="empty"
        title="Cet événement n’est plus disponible"
        description="Il a peut-être été annulé, ou la vente est terminée."
        actions={<Link to={paths.home} className={primaryActionClass}>Voir les événements</Link>}
      />
    );
  }

  const event = lookup.value;

  const continueToPayment = async (category: TicketCategory, quantity: number) => {
    setActionError('');
    if (!user) {
      setActionError('Connectez-vous ou créez un compte avant de réserver.');
      openProfile();
      return;
    }
    setIsBooking(true);
    try {
      const booking = await bookingApi.createEvent(event.id, category.id, quantity);
      flow.selectEvent(event);
      flow.holdCreated({
        seats: [],
        category,
        quantity,
        totalPrice: Number(booking.amount_xof) || category.price * quantity,
        bookingId: booking.id,
        holdExpiresAt: booking.hold_expires_at,
      });
      navigate(paths.payment);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible de réserver ces billets.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <EventTicketSelectionScreen
      event={event}
      onContinue={continueToPayment}
      onBack={() => navigate(paths.home)}
      isBooking={isBooking}
      actionError={actionError}
    />
  );
}
