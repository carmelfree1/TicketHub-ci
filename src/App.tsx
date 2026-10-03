import React, { useState } from 'react';
import { AppScreen, UserRole, TripDeparture, DigitalTicket } from './types';
import { MOCK_TRIPS, INITIAL_DIGITAL_TICKET } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ProfileModal } from './components/ProfileModal';
import { ExplorerScreen } from './screens/ExplorerScreen';
import { SeatSelectionScreen } from './screens/SeatSelectionScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { DigitalPassScreen } from './screens/DigitalPassScreen';
import { TicketsWalletScreen } from './screens/TicketsWalletScreen';
import { PartnerDashboardScreen } from './screens/partner/PartnerDashboardScreen';
import { PartnerFleetScreen } from './screens/partner/PartnerFleetScreen';
import { PartnerScannerScreen } from './screens/partner/PartnerScannerScreen';
import { PartnerManifestScreen } from './screens/partner/PartnerManifestScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('explorer');
  const [userRole, setUserRole] = useState<UserRole>('traveler');
  const [selectedTrip, setSelectedTrip] = useState<TripDeparture>(MOCK_TRIPS[0]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([14]);
  const [totalPrice, setTotalPrice] = useState<number>(5000);
  const [digitalTicket, setDigitalTicket] = useState<DigitalTicket>(INITIAL_DIGITAL_TICKET);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Navigation handlers
  const handleSelectTrip = (trip: TripDeparture) => {
    setSelectedTrip(trip);
    setTotalPrice(trip.price * selectedSeats.length);
    setCurrentScreen('seat-selection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueToPayment = (seats: number[], amount: number) => {
    setSelectedSeats(seats);
    setTotalPrice(amount);
    setCurrentScreen('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentSuccess = () => {
    // Generate new digital ticket for this booking
    const newTicket: DigitalTicket = {
      ...INITIAL_DIGITAL_TICKET,
      carrier: selectedTrip.carrier,
      departCity: selectedTrip.departCity.toUpperCase(),
      departStation: selectedTrip.departStation,
      arrivalCity: selectedTrip.arrivalCity.toUpperCase(),
      arrivalStation: selectedTrip.arrivalStation,
      departureTime: selectedTrip.departTime,
      duration: selectedTrip.duration,
      seats: selectedSeats,
      price: totalPrice,
      commandRef: `CMD-2024-${Math.floor(10000 + Math.random() * 90000)}`,
      ticketCode: `TKH-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      issuedAt: `Émis le ${new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })} à ${new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    };

    setDigitalTicket(newTicket);
    setCurrentScreen('digital-pass');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (screen: AppScreen) => {
    // If switching between screens, ensure appropriate role is set
    if (
      screen === 'partner-dashboard' ||
      screen === 'partner-fleet' ||
      screen === 'partner-scanner' ||
      screen === 'partner-manifest'
    ) {
      setUserRole('partner');
    } else {
      setUserRole('traveler');
    }
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col items-center">
      {/* Container wrapper ensuring standard mobile-first view while looking sleek on desktop */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[#f8f9ff] relative shadow-2xl">
        {/* Top Fixed Navigation Header */}
        <Header
          currentScreen={currentScreen}
          userRole={userRole}
          onNavigate={handleNavigate}
          onToggleRole={() =>
            setUserRole((prev) => (prev === 'traveler' ? 'partner' : 'traveler'))
          }
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* Main Screen Content Viewport */}
        <main className="flex-1 w-full pt-16">
          {currentScreen === 'explorer' && (
            <ExplorerScreen
              onSelectTrip={handleSelectTrip}
              onNavigate={handleNavigate}
            />
          )}

          {currentScreen === 'seat-selection' && (
            <SeatSelectionScreen
              trip={selectedTrip}
              onContinueToPayment={handleContinueToPayment}
              onBack={() => handleNavigate('explorer')}
            />
          )}

          {currentScreen === 'payment' && (
            <PaymentScreen
              trip={selectedTrip}
              selectedSeats={selectedSeats}
              totalAmount={totalPrice}
              onPaymentSuccess={handlePaymentSuccess}
              onBack={() => handleNavigate('seat-selection')}
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
              currentTicket={digitalTicket}
              onViewPass={(ticket) => {
                setDigitalTicket(ticket);
                setCurrentScreen('digital-pass');
              }}
              onExplore={() => handleNavigate('explorer')}
            />
          )}

          {/* Partner Pro Screens */}
          {currentScreen === 'partner-dashboard' && (
            <PartnerDashboardScreen onNavigate={handleNavigate} />
          )}

          {currentScreen === 'partner-fleet' && (
            <PartnerFleetScreen onNavigate={handleNavigate} />
          )}

          {currentScreen === 'partner-scanner' && (
            <PartnerScannerScreen
              onNavigate={handleNavigate}
              onBack={() => handleNavigate('partner-fleet')}
            />
          )}

          {currentScreen === 'partner-manifest' && (
            <PartnerManifestScreen />
          )}
        </main>

        {/* Bottom Tab Navigation Bar */}
        <BottomNav
          currentScreen={currentScreen}
          userRole={userRole}
          onNavigate={handleNavigate}
          activeTicketCount={2}
        />

        {/* Profile & Mode Switcher Modal */}
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userRole={userRole}
          onSelectRole={(role) => setUserRole(role)}
          onNavigateScreen={handleNavigate}
        />
      </div>
    </div>
  );
}
