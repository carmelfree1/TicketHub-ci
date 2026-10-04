import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SeatSelectionScreen } from '@/features/booking/pages/SeatSelectionScreen';
import { bookingApi } from '@/features/booking/api';
import { catalogApi } from '@/features/catalog/api';
import { StatusPanel, primaryActionClass } from '@/components/feedback/StatusPanel';
import { useAsyncValue } from '@/hooks/useAsyncValue';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';
import { useSession } from '@/app/session';

export function Component() {
  const { tripId = '' } = useParams();
  const navigate = useNavigate();
  const flow = useBookingFlow();
  const { user, openProfile } = useSession();
  const [isBooking, setIsBooking] = useState(false);
  const [actionError, setActionError] = useState('');

  const known = flow.draft.trip?.id === tripId ? flow.draft.trip : null;
  const lookup = useAsyncValue(
    async () => known ?? (await catalogApi.trips()).find((candidate) => candidate.id === tripId),
    tripId,
  );

  if (lookup.status === 'loading') return <StatusPanel tone="loading" title="Chargement du départ" />;
  if (lookup.status === 'error') {
    return (
      <StatusPanel
        tone="error"
        title="Départ indisponible"
        description="Impossible de charger ce départ. Vérifiez votre connexion puis réessayez."
        actions={<button type="button" onClick={lookup.retry} className={primaryActionClass}>Réessayer</button>}
      />
    );
  }
  if (lookup.status === 'missing') {
    return (
      <StatusPanel
        tone="empty"
        title="Ce départ n’est plus disponible"
        description="Il a peut-être été complet, annulé ou déjà parti."
        actions={<Link to={paths.home} className={primaryActionClass}>Voir les départs</Link>}
      />
    );
  }

  const trip = lookup.value;

  const continueToPayment = async (seats: number[], amount: number) => {
    setActionError('');
    if (!user) {
      setActionError('Connectez-vous ou créez un compte avant de réserver.');
      openProfile();
      return;
    }
    setIsBooking(true);
    try {
      const booking = await bookingApi.createTransport(trip.id, seats);
      flow.selectTrip(trip);
      flow.holdCreated({
        seats,
        category: null,
        quantity: seats.length,
        totalPrice: Number(booking.amount_xof) || amount,
        bookingId: booking.id,
        holdExpiresAt: booking.hold_expires_at,
      });
      navigate(paths.payment);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible de réserver ces sièges.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <SeatSelectionScreen
      trip={trip}
      onContinueToPayment={continueToPayment}
      onBack={() => navigate(paths.home)}
      isBooking={isBooking}
      actionError={actionError}
    />
  );
}
