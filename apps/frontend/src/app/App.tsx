import React, { useEffect, useState } from 'react';
import { AppScreen, AuthUser, DigitalTicket, TicketCategory, TicketedEvent, TripDeparture } from '@/types';
import { ApiError } from '@/services/api';
import { authApi } from '@/features/auth/api';
import { catalogApi } from '@/features/catalog/api';
import { bookingApi } from '@/features/booking/api';
import { paymentsApi } from '@/features/payments/api';
import { ticketsApi } from '@/features/tickets/api';
import { EMPTY_DIGITAL_TICKET, toDigitalTicket } from '@/services/ticketMapper';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProfileModal } from '@/components/forms/ProfileModal';
import { ExplorerScreen } from '@/features/catalog/pages/ExplorerScreen';
import { SeatSelectionScreen } from '@/features/booking/pages/SeatSelectionScreen';
import { EventTicketSelectionScreen } from '@/features/booking/pages/EventTicketSelectionScreen';
import { PaymentScreen } from '@/features/payments/pages/PaymentScreen';
import { PaymentResultScreen, PaymentReturnState } from '@/features/payments/pages/PaymentResultScreen';
import { DigitalPassScreen } from '@/features/tickets/pages/DigitalPassScreen';
import { TicketsWalletScreen } from '@/features/tickets/pages/TicketsWalletScreen';
import { PartnerDashboardScreen } from '@/features/providers/pages/PartnerDashboardScreen';
import { PartnerFleetScreen } from '@/features/providers/pages/PartnerFleetScreen';
import { PartnerScannerScreen } from '@/features/tickets/scanner/PartnerScannerScreen';
import { PartnerManifestScreen } from '@/features/tickets/pages/PartnerManifestScreen';

const partnerScreens: AppScreen[] = [
  'partner-dashboard',
  'partner-fleet',
  'partner-scanner',
  'partner-manifest',
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('explorer');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripDeparture | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([14]);
  const [selectedEvent, setSelectedEvent] = useState<TicketedEvent | null>(null);
  const [selectedEventCategory, setSelectedEventCategory] = useState<TicketCategory | null>(null);
  const [eventQuantity, setEventQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState<number>(5000);
  const [bookingId, setBookingId] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState('');
  const [flowError, setFlowError] = useState('');
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const [digitalTicket, setDigitalTicket] = useState<DigitalTicket>(EMPTY_DIGITAL_TICKET);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [paymentReturnState, setPaymentReturnState] = useState<PaymentReturnState>('checking');
  const [paymentReturnMessage, setPaymentReturnMessage] = useState('Nous vérifions la confirmation reçue de la passerelle de paiement.');
  const [returnBookingId, setReturnBookingId] = useState('');
  const [retryPaymentStatus, setRetryPaymentStatus] = useState(0);

  const userRole = authUser?.role ?? 'traveler';

  useEffect(() => {
    let active = true;
    authApi.me()
      .then((user) => { if (active) setAuthUser(user); })
      .catch(() => { if (active) setAuthUser(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    catalogApi.trips()
      .then((trips) => {
        if (!active || !trips.length) return;
        setSelectedTrip(trips[0]);
      })
      .catch(() => {
        // Les données du catalogue viennent du backend si disponible.
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authUser || authUser.role !== 'traveler') {
      setActiveTicketCount(0);
      return;
    }
    let active = true;
    ticketsApi.list()
      .then((tickets) => {
        if (active) setActiveTicketCount(tickets.filter((ticket) => ticket.status === 'active').length);
      })
      .catch(() => { if (active) setActiveTicketCount(0); });
    return () => { active = false; };
  }, [authUser, ticketRefreshKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedBooking = params.get('booking');
    const payment = params.get('payment');
    if (!returnedBooking || !payment) return;
    setReturnBookingId(returnedBooking);
    setCurrentScreen('payment-result');
    setPaymentReturnState('checking');
    setPaymentReturnMessage('Nous vérifions la confirmation reçue de la passerelle. La redirection seule ne valide pas le paiement.');
  }, []);

  useEffect(() => {
    if (!returnBookingId) return;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const checkStatus = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const booking = await bookingApi.get(returnBookingId);
        if (stopped) return;
        if (booking.status === 'paid') {
          const tickets = await ticketsApi.list();
          setActiveTicketCount(tickets.filter((item) => item.status === 'active').length);
          const ticket = tickets.find((item) => item.commandRef === returnBookingId);
          if (!ticket) {
            setPaymentReturnState('error');
            setPaymentReturnMessage('Le paiement est confirmé, mais le billet n’apparaît pas encore. Réessayez la vérification ou contactez le support.');
            return;
          }
          setDigitalTicket(toDigitalTicket(ticket));
          setCurrentScreen('digital-pass');
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
        if (booking.status === 'needs_review') {
          setPaymentReturnState('review');
          setPaymentReturnMessage('Le paiement est reçu, mais le délai de réservation a expiré. Notre équipe doit vérifier la commande avant d’émettre un billet.');
          return;
        }
        if (booking.status === 'failed' || booking.status === 'expired' || booking.status === 'cancelled') {
          setPaymentReturnState('failed');
          setPaymentReturnMessage('La réservation n’a pas été confirmée dans le délai prévu et aucun billet n’a été émis. Si votre compte a été débité, contactez le support pour vérification.');
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
        if (attempts >= 60) {
          setPaymentReturnState('pending');
          setPaymentReturnMessage('La passerelle n’a pas encore confirmé le paiement. Vérifiez de nouveau dans quelques instants.');
          return;
        }
        setPaymentReturnState('checking');
        setPaymentReturnMessage('Confirmation en attente. Nous interrogeons la réservation ; le billet sera émis après le webhook vérifié.');
        timeout = setTimeout(checkStatus, 3000);
      } catch (error) {
        if (stopped) return;
        setPaymentReturnState('error');
        setPaymentReturnMessage(error instanceof ApiError && error.status === 401
          ? 'Votre session a expiré. Connectez-vous avec le même compte pour vérifier cette réservation.'
          : 'Impossible de joindre l’API. Vérifiez votre connexion puis réessayez.');
      }
    };

    void checkStatus();
    return () => {
      stopped = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [returnBookingId, retryPaymentStatus]);

  const handleSelectTrip = (trip: TripDeparture) => {
    setSelectedTrip(trip);
    setSelectedEvent(null);
    setSelectedEventCategory(null);
    setSelectedSeats([14]);
    setTotalPrice(trip.price);
    setBookingId('');
    setFlowError('');
    setCurrentScreen('seat-selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueToPayment = async (seats: number[], amount: number) => {
    setFlowError('');
    if (!authUser) {
      setFlowError('Connectez-vous ou créez un compte avant de réserver.');
      setIsProfileModalOpen(true);
      return;
    }
    if (!selectedTrip) {
      setFlowError('Aucun trajet disponible pour cette réservation. Rechargez le catalogue.');
      return;
    }
    setIsCreatingBooking(true);
    try {
      const booking = await bookingApi.createTransport(selectedTrip.id, seats);
      setSelectedSeats(seats);
      setTotalPrice(Number(booking.amount_xof) || amount);
      setBookingId(booking.id);
      setHoldExpiresAt(booking.hold_expires_at);
      setSelectedEvent(null);
      setSelectedEventCategory(null);
      setCurrentScreen('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Impossible de réserver ces sièges.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleSelectEvent = (event: TicketedEvent) => {
    setSelectedEvent(event);
    setSelectedEventCategory(event.categories[0] ?? null);
    setEventQuantity(1);
    setBookingId('');
    setFlowError('');
    setCurrentScreen('event-selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueEvent = async (category: TicketCategory, quantity: number) => {
    if (!selectedEvent) return;
    setFlowError('');
    if (!authUser) {
      setFlowError('Connectez-vous ou créez un compte avant de réserver.');
      setIsProfileModalOpen(true);
      return;
    }
    setIsCreatingBooking(true);
    try {
      const booking = await bookingApi.createEvent(selectedEvent.id, category.id, quantity);
      setSelectedEventCategory(category);
      setEventQuantity(quantity);
      setTotalPrice(Number(booking.amount_xof) || category.price * quantity);
      setBookingId(booking.id);
      setHoldExpiresAt(booking.hold_expires_at);
      setCurrentScreen('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Impossible de réserver ces billets.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handleStartPayment = async (method: string) => {
    if (!bookingId) throw new Error('Aucune réservation active. Recommencez la sélection.');
    const payment = await paymentsApi.start(bookingId, method);
    if (!payment.checkoutUrl || !/^https:\/\//i.test(payment.checkoutUrl)) {
      throw new Error('URL de checkout GeniusPay invalide.');
    }
    window.location.assign(payment.checkoutUrl);
  };

  const handleNavigate = (screen: AppScreen) => {
    if (currentScreen === 'payment-result' && screen !== 'payment-result') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setReturnBookingId('');
    }
    if (partnerScreens.includes(screen) && authUser?.role !== 'partner') {
      setIsProfileModalOpen(true);
      return;
    }
    if (screen === 'tickets-wallet' && authUser?.role === 'partner') {
      setCurrentScreen('partner-dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (screen === 'tickets-wallet') setTicketRefreshKey((value) => value + 1);
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthenticate = async (
    mode: 'login' | 'register',
    credentials: { fullName?: string; phone: string; password: string; partnerInviteCode?: string },
  ) => {
    const user = mode === 'login'
      ? await authApi.login({ phone: credentials.phone, password: credentials.password })
      : await authApi.register({
          fullName: credentials.fullName || '',
          phone: credentials.phone,
          password: credentials.password,
          partnerInviteCode: credentials.partnerInviteCode,
        });
    setAuthUser(user);
    setFlowError('');
    if (user.role === 'partner') setCurrentScreen('partner-dashboard');
  };

  const handleLogout = async () => {
    await authApi.logout();
    setAuthUser(null);
    setCurrentScreen('explorer');
  };

  const handlePaymentRetry = () => {
    setPaymentReturnState('checking');
    setPaymentReturnMessage('Nouvelle vérification de la réservation…');
    setRetryPaymentStatus((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-[#eef3ff] text-[#0b1c30]">
      <div className="mx-auto w-full min-h-screen max-w-[1440px] flex flex-col bg-[#f8f9ff] relative lg:border-x lg:border-[#dce9ff]">
        <Header
          currentScreen={currentScreen}
          userRole={userRole}
          onNavigate={handleNavigate}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          backScreen={selectedEvent ? 'event-selection' : 'seat-selection'}
        />

        <main className="flex-1 w-full pt-16">
          {currentScreen === 'explorer' && (
            <ExplorerScreen onSelectTrip={handleSelectTrip} onSelectEvent={handleSelectEvent} />
          )}

          {currentScreen === 'seat-selection' && selectedTrip && (
            <SeatSelectionScreen
              trip={selectedTrip}
              onContinueToPayment={handleContinueToPayment}
              onBack={() => handleNavigate('explorer')}
              isBooking={isCreatingBooking}
              actionError={flowError}
            />
          )}

          {currentScreen === 'event-selection' && selectedEvent && (
            <EventTicketSelectionScreen
              event={selectedEvent}
              onContinue={handleContinueEvent}
              onBack={() => handleNavigate('explorer')}
              isBooking={isCreatingBooking}
              actionError={flowError}
            />
          )}

          {currentScreen === 'payment' && selectedTrip && (
            <PaymentScreen
              trip={selectedTrip}
              selectedSeats={selectedSeats}
              totalAmount={totalPrice}
              bookingId={bookingId}
              holdExpiresAt={holdExpiresAt}
              event={selectedEvent ?? undefined}
              eventCategory={selectedEventCategory ?? undefined}
              eventQuantity={eventQuantity}
              onStartPayment={handleStartPayment}
              onBack={() => handleNavigate(selectedEvent ? 'event-selection' : 'seat-selection')}
            />
          )}

          {currentScreen === 'payment-result' && (
            <PaymentResultScreen
              state={paymentReturnState}
              message={paymentReturnMessage}
              onRetry={handlePaymentRetry}
              onExplore={() => handleNavigate('explorer')}
            />
          )}

          {currentScreen === 'digital-pass' && (
            <DigitalPassScreen
              ticket={digitalTicket}
              onBackToExplorer={() => handleNavigate('explorer')}
            />
          )}

          {currentScreen === 'tickets-wallet' && (
            <TicketsWalletScreen
              user={authUser}
              onViewPass={(ticket) => {
                setDigitalTicket(ticket);
                setCurrentScreen('digital-pass');
              }}
              onExplore={() => handleNavigate('explorer')}
              onLogin={() => setIsProfileModalOpen(true)}
            />
          )}

          {currentScreen === 'partner-dashboard' && <PartnerDashboardScreen onNavigate={handleNavigate} />}
          {currentScreen === 'partner-fleet' && <PartnerFleetScreen onNavigate={handleNavigate} />}
          {currentScreen === 'partner-scanner' && (
            <PartnerScannerScreen onNavigate={handleNavigate} onBack={() => handleNavigate('partner-fleet')} />
          )}
          {currentScreen === 'partner-manifest' && <PartnerManifestScreen />}
        </main>

        <BottomNav
          currentScreen={currentScreen}
          userRole={userRole}
          onNavigate={handleNavigate}
          activeTicketCount={activeTicketCount}
        />

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={authUser}
          onAuthenticate={handleAuthenticate}
          onLogout={handleLogout}
          onNavigateScreen={handleNavigate}
        />
      </div>
    </div>
  );
}
