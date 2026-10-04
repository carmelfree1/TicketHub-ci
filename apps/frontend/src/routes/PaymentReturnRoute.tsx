import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { PaymentResultScreen, type PaymentReturnState } from '@/features/payments/pages/PaymentResultScreen';
import { bookingApi } from '@/features/booking/api';
import { ticketsApi } from '@/features/tickets/api';
import { ApiError } from '@/services/api';
import { toDigitalTicket } from '@/services/ticketMapper';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';
import { useSession } from '@/app/session';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 60;

export function Component() {
  const [params] = useSearchParams();
  const bookingId = params.get('booking') ?? '';
  const navigate = useNavigate();
  const flow = useBookingFlow();
  const { ready, refreshTickets } = useSession();
  const [state, setState] = useState<PaymentReturnState>('checking');
  const [message, setMessage] = useState('Nous vérifions la confirmation reçue de la passerelle. La redirection seule ne valide pas le paiement.');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!bookingId || !ready) return;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const check = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const booking = await bookingApi.get(bookingId);
        if (stopped) return;
        if (booking.status === 'paid') {
          const tickets = await ticketsApi.list();
          if (stopped) return;
          const ticket = tickets.find((item) => item.commandRef === bookingId);
          if (!ticket) {
            setState('error');
            setMessage('Le paiement est confirmé, mais le billet n’apparaît pas encore. Réessayez la vérification ou contactez le support.');
            return;
          }
          const digital = toDigitalTicket(ticket);
          flow.showTicket(digital);
          refreshTickets();
          navigate(paths.ticket(digital.ticketCode), { replace: true });
          return;
        }
        if (booking.status === 'needs_review') {
          setState('review');
          setMessage('Le paiement est reçu, mais le délai de réservation a expiré. Notre équipe doit vérifier la commande avant d’émettre un billet.');
          return;
        }
        if (booking.status === 'failed' || booking.status === 'expired' || booking.status === 'cancelled') {
          setState('failed');
          setMessage('La réservation n’a pas été confirmée dans le délai prévu et aucun billet n’a été émis. Si votre compte a été débité, contactez le support pour vérification.');
          return;
        }
        if (attempts >= MAX_ATTEMPTS) {
          setState('pending');
          setMessage('La passerelle n’a pas encore confirmé le paiement. Vérifiez de nouveau dans quelques instants.');
          return;
        }
        setState('checking');
        setMessage('Confirmation en attente. Nous interrogeons la réservation ; le billet sera émis après le webhook vérifié.');
        timeout = setTimeout(check, POLL_INTERVAL_MS);
      } catch (error) {
        if (stopped) return;
        setState('error');
        setMessage(error instanceof ApiError && error.status === 401
          ? 'Votre session a expiré. Connectez-vous avec le même compte pour vérifier cette réservation.'
          : 'Impossible de joindre l’API. Vérifiez votre connexion puis réessayez.');
      }
    };

    void check();
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
    };
    // flow, navigate and refreshTickets are stable enough for this effect; re-running it would restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, ready, retryKey]);

  if (!bookingId) return <Navigate to={paths.home} replace />;

  return (
    <PaymentResultScreen
      state={state}
      message={message}
      onRetry={() => {
        setState('checking');
        setMessage('Nouvelle vérification de la réservation…');
        setRetryKey((value) => value + 1);
      }}
      onExplore={() => navigate(paths.home)}
    />
  );
}
