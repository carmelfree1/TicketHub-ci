import React, { useState, useEffect } from 'react';
import { formatXof } from '@tickethub/shared';
import { type TripDeparture } from '@/types';
import { catalogApi } from '@/features/catalog/api';

interface SeatSelectionScreenProps {
  trip: TripDeparture;
  onContinueToPayment: (selectedSeats: number[], totalAmount: number) => void;
  onBack: () => void;
  isBooking?: boolean;
  actionError?: string;
}

export const SeatSelectionScreen: React.FC<SeatSelectionScreenProps> = ({
  trip,
  onContinueToPayment,
  isBooking = false,
  actionError = '',
}) => {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [availabilitySource, setAvailabilitySource] = useState<'loading' | 'server' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    catalogApi.seats(trip.id)
      .then((result) => {
        if (!active) return;
        const occupied = result.seats.filter((seat) => seat.status === 'occupied').map((seat) => seat.number);
        setOccupiedSeats(occupied);
        setAvailabilitySource('server');
        setSelectedSeats((current) => current.filter((seat) => !occupied.includes(seat)));
      })
      .catch(() => { if (active) setAvailabilitySource('error'); });
    return () => { active = false; };
  }, [trip.id]);

  const toggleSeat = (seatNum: number) => {
    if (occupiedSeats.includes(seatNum)) return;

    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNum));
    } else {
      if (selectedSeats.length >= 4) return; // Max 4 seats per booking
      setSelectedSeats([...selectedSeats, seatNum].sort((a, b) => a - b));
    }
  };

  const totalPrice = selectedSeats.length * trip.price;

  const getSeatDescription = () => {
    if (selectedSeats.length === 0) return 'Aucun siège choisi';
    if (selectedSeats.length === 1) {
      const s = selectedSeats[0];
      const row = Math.ceil(s / 4);
      const isWindow = s % 4 === 1 || s % 4 === 0;
      return `1 Siège : N°${s} (${isWindow ? 'Fenêtre' : 'Couloir'} - R${row})`;
    }
    return `${selectedSeats.length} Sièges : ${selectedSeats.map((s) => `N°${s}`).join(', ')}`;
  };

  const renderSeatButton = (seatNum: number) => {
    const isSelected = selectedSeats.includes(seatNum);
    const isOccupied = occupiedSeats.includes(seatNum);

    if (isOccupied) {
      return (
        <button
          key={seatNum}
          disabled
          aria-label={`Siège ${seatNum} occupé`}
          className="h-11 rounded-lg bg-[#dce9ff] text-[#565e74] flex items-center justify-center font-headline text-[13px] font-bold cursor-not-allowed select-none opacity-80"
        >
          {String(seatNum).padStart(2, '0')}
        </button>
      );
    }

    if (isSelected) {
      return (
        <button
          key={seatNum}
          type="button"
          onClick={() => toggleSeat(seatNum)}
          aria-label={`Siège ${seatNum} sélectionné`}
          className="h-11 rounded-lg bg-[#c2410c] text-white font-headline text-[13px] font-bold shadow-md ring-2 ring-[#ff6b00]/40 flex flex-col items-center justify-center transition-all scale-105 cursor-pointer"
        >
          <span className="leading-none">{String(seatNum).padStart(2, '0')}</span>
          <span className="material-symbols-outlined text-[13px] font-bold" aria-hidden="true">check</span>
        </button>
      );
    }

    return (
      <button
        key={seatNum}
        type="button"
        onClick={() => toggleSeat(seatNum)}
        aria-label={`Choisir le siège ${seatNum}`}
        className="h-11 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] shadow-xs border border-[#e2bfb0]/40 transition-all flex items-center justify-center font-headline text-[13px] font-bold active:scale-95 cursor-pointer"
      >
        {String(seatNum).padStart(2, '0')}
      </button>
    );
  };

  return (
    <div className="flex flex-col w-full pb-36 max-w-md mx-auto">
      {/* 1. Server-side seat reservation notice */}
      <div className="px-4 pt-2 pb-2">
        <div className="w-full bg-[#eff4ff] text-[#0b1c30] rounded-2xl p-3.5 shadow-sm border border-[#dce9ff] flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#216b43] text-[20px]" aria-hidden="true">verified_user</span>
          <p className="font-body text-[12px] leading-snug">
            {availabilitySource === 'server'
              ? 'Choisissez jusqu’à 4 sièges. Ils sont réservés pour vous pendant le paiement, dès que vous confirmez la sélection.'
              : availabilitySource === 'error'
                ? 'Les disponibilités n’ont pas pu être chargées. Rechargez la page avant de choisir vos sièges.'
                : 'Chargement des disponibilités…'}
          </p>
        </div>
      </div>

      {/* 2. Trajectory Overview Bento Card */}
      <div className="px-4 py-1">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2bfb0]/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#eff4ff] text-[#0b1c30] font-headline text-[12px] font-bold rounded-lg uppercase tracking-wider border border-[#dce9ff]">
                {trip.carrier}
              </span>
            </div>
            <span className="font-headline text-[17px] text-[#c2410c] font-bold">
              {formatXof(trip.price)} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[18px] font-bold text-[#0b1c30]">
                {trip.departTime}
              </span>
              <span className="font-body text-[12px] text-[#5a4136] truncate">
                {trip.departCity} · {trip.departStation}
              </span>
            </div>

            <div className="flex flex-col items-center px-2 flex-1">
              <span className="font-body text-[11px] text-[#5a4136]">{trip.duration}</span>
              <div className="w-full flex items-center gap-1 my-1">
                <div className="w-2 h-2 rounded-full bg-[#ff6b00]"></div>
                <div className="h-0.5 flex-1 bg-[#dce9ff]"></div>
                <span className="material-symbols-outlined text-[#c2410c] text-[15px]" aria-hidden="true">
                  directions_bus
                </span>
                <div className="h-0.5 flex-1 bg-[#dce9ff]"></div>
                <div className="w-2 h-2 rounded-full bg-[#216b43]"></div>
              </div>
              <span className="font-body text-[11px] text-[#216b43] font-bold">Direct</span>
            </div>

            <div className="flex flex-col items-end min-w-0 text-right">
              <span className="font-headline text-[18px] font-bold text-[#0b1c30]">
                {trip.arrivalTime}
              </span>
              <span className="font-body text-[12px] text-[#5a4136] truncate">
                {trip.arrivalCity}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Legend Section */}
      <div className="px-4 py-1">
        <div className="bg-[#eff4ff] rounded-2xl p-3 border border-[#dce9ff]">
          <span className="font-headline text-[10px] uppercase tracking-wider text-[#5a4136] font-bold block mb-2">
            État des places
          </span>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white border border-[#e2bfb0]/60 shadow-xs flex items-center justify-center font-headline text-[11px] font-bold text-[#0b1c30]">
                1
              </div>
              <span className="font-body text-[12px] text-[#0b1c30]">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#c2410c] text-white shadow-xs flex items-center justify-center">
                <span className="material-symbols-outlined text-[13px] font-bold" aria-hidden="true">check</span>
              </div>
              <span className="font-body text-[12px] text-[#0b1c30] font-bold">Votre choix</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#dce9ff] text-[#565e74] flex items-center justify-center">
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">close</span>
              </div>
              <span className="font-body text-[12px] text-[#565e74]">Occupé</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Interactive Bus Cabin Deck Plan */}
      <div className="px-4 py-2 flex justify-center">
        <div className="w-full bg-white rounded-3xl shadow-sm border border-[#e2bfb0]/40 p-4 relative">
          {/* Cockpit / Driver Cabin Header */}
          <div className="bg-[#eff4ff] rounded-2xl p-2.5 mb-3 flex items-center justify-between border border-[#dce9ff]">
            <div className="flex items-center gap-1.5 text-[#565e74]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">sensor_door</span>
              <span className="font-headline text-[11px] font-bold">Porte d'accès</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#0b1c30] bg-white px-2.5 py-1 rounded-lg shadow-xs border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[18px] text-[#c2410c]" aria-hidden="true">sports_score</span>
              <span className="font-headline text-[11px] font-bold">Chauffeur</span>
            </div>
          </div>

          {/* Bus Body Aisle Guide */}
          <div className="grid grid-cols-5 text-center font-headline text-[10px] text-[#5a4136] pb-2 font-bold tracking-wider uppercase">
            <span>A (Fenêtre)</span>
            <span>B</span>
            <span className="text-[#a04100]">Allée</span>
            <span>C</span>
            <span>D (Fenêtre)</span>
          </div>

          {/* Bus Rows 1 through 9 (2+2 layout) */}
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((rowNum) => {
              const seatA = (rowNum - 1) * 4 + 1;
              const seatB = (rowNum - 1) * 4 + 2;
              const seatC = (rowNum - 1) * 4 + 3;
              const seatD = (rowNum - 1) * 4 + 4;

              return (
                <div key={rowNum} className="grid grid-cols-5 gap-1.5 items-center">
                  {renderSeatButton(seatA)}
                  {renderSeatButton(seatB)}
                  <div className="text-center font-headline text-[11px] text-[#5a4136] font-bold">
                    R{rowNum}
                  </div>
                  {renderSeatButton(seatC)}
                  {renderSeatButton(seatD)}
                </div>
              );
            })}

            {/* Row 10 (Rear Banquette - 5 seats: 37, 38, 39, 40, 41) */}
            <div className="grid grid-cols-5 gap-1.5 items-center pt-1 border-t border-[#eff4ff]">
              {[37, 38, 39, 40, 41].map((s) => renderSeatButton(s))}
            </div>
          </div>

          {/* Bus Rear Emergency Exit */}
          <div className="mt-3 pt-2 text-center border-t border-[#eff4ff]">
            <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#ba1a1a]" aria-hidden="true">emergency</span>
              Issue de secours arrière
            </span>
          </div>
        </div>
      </div>

      {/* 6. Security Reassurance Footnote */}
      <div className="px-4 py-2">
        <div className="bg-[#eff4ff] rounded-2xl p-3 flex items-center gap-2.5 border border-[#dce9ff]">
          <div className="w-8 h-8 rounded-full bg-[#a5f0be] text-[#00522e] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">verified_user</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-[11px] font-bold text-[#0b1c30]">
              Paiement par GeniusPay
            </span>
            <span className="font-body text-[11px] text-[#565e74]">
              Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire.
            </span>
          </div>
        </div>
      </div>

      {/* 7. Sticky Bottom Summary Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#dce9ff] shadow-[0_-8px_30px_rgba(11,28,48,0.12)] p-4">
        <div className="max-w-md mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="font-headline text-[10px] text-[#5a4136] uppercase tracking-wider font-bold">
                Sièges choisis
              </span>
              <span className="font-headline text-[14px] font-bold text-[#0b1c30] truncate">
                {getSeatDescription()}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-headline text-[18px] text-[#c2410c] font-bold">
                {formatXof(totalPrice)} FCFA
              </span>
            </div>
          </div>

          {actionError && <p role="alert" className="p-2 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[11px]">{actionError}</p>}
          <button
            type="button"
            disabled={isBooking || selectedSeats.length === 0 || availabilitySource !== 'server'}
            onClick={() => onContinueToPayment(selectedSeats, totalPrice)}
            className="w-full min-h-[50px] bg-[#c2410c] hover:bg-[#9a3412] hover:opacity-95 active:scale-[0.98] transition-all text-white font-headline text-[15px] rounded-xl font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{isBooking ? 'progress_activity' : 'lock'}</span>
            <span>{isBooking ? 'Verrouillage des sièges…' : 'Continuer vers le paiement'}</span>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
