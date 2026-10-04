import { useNavigate } from 'react-router';
import { TicketsWalletScreen } from '@/features/tickets/pages/TicketsWalletScreen';
import { useBookingFlow } from '@/app/booking-flow';
import { paths } from '@/app/navigation';
import { useSession } from '@/app/session';

export function Component() {
  const navigate = useNavigate();
  const flow = useBookingFlow();
  const { user, openProfile } = useSession();

  return (
    <TicketsWalletScreen
      user={user}
      onViewPass={(ticket) => {
        flow.showTicket(ticket);
        navigate(paths.ticket(ticket.ticketCode));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onExplore={() => navigate(paths.home)}
      onLogin={openProfile}
    />
  );
}
