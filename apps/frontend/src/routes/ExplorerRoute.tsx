import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ExplorerScreen } from '@/features/catalog/pages/ExplorerScreen';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';

export function Component() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const flow = useBookingFlow();

  // Payment links issued before the URL scheme change returned to "/?payment=...&booking=...".
  const returnedBooking = params.get('booking');
  if (returnedBooking && params.get('payment')) {
    return <Navigate to={`${paths.paymentReturn}?booking=${encodeURIComponent(returnedBooking)}`} replace />;
  }

  return (
    <ExplorerScreen
      onSelectTrip={(trip) => {
        flow.selectTrip(trip);
        navigate(paths.trip(trip.id));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onSelectEvent={(event) => {
        flow.selectEvent(event);
        navigate(paths.event(event.id));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    />
  );
}
