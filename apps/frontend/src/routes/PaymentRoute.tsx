import { Navigate, useNavigate } from 'react-router';
import { PaymentScreen } from '@/features/payments/pages/PaymentScreen';
import { paymentsApi } from '@/features/payments/api';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';

export function Component() {
  const navigate = useNavigate();
  const { draft } = useBookingFlow();

  // The hold lives in memory only; after a reload there is nothing to pay for, so restart from the catalog.
  if (!draft.bookingId || (!draft.trip && !draft.event)) return <Navigate to={paths.home} replace />;

  const startPayment = async (method: string) => {
    const payment = await paymentsApi.start(draft.bookingId, method);
    if (!payment.checkoutUrl || !/^https:\/\//i.test(payment.checkoutUrl)) {
      throw new Error('URL de checkout GeniusPay invalide.');
    }
    window.location.assign(payment.checkoutUrl);
  };

  return (
    <PaymentScreen
      trip={draft.trip ?? undefined}
      selectedSeats={draft.seats}
      totalAmount={draft.totalPrice}
      bookingId={draft.bookingId}
      holdExpiresAt={draft.holdExpiresAt}
      event={draft.event ?? undefined}
      eventCategory={draft.category ?? undefined}
      eventQuantity={draft.quantity}
      onStartPayment={startPayment}
      onBack={() => navigate(draft.event ? paths.event(draft.event.id) : draft.trip ? paths.trip(draft.trip.id) : paths.home)}
    />
  );
}
