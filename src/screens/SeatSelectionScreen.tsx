import React, { useState, useEffect } from 'react';
import { TripDeparture } from '../types';
import { ASSETS } from '../data/mockData';
import { api } from '../services/api';

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
  const [selectedSeats, setSelectedSeats] = useState<number[]>([14]);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([1, 2, 5, 11, 12, 19, 20, 27, 28, 29, 36]);
  const [availabilitySource, setAvailabilitySource] = useState<'loading' | 'server' | 'demo'>('loading');
  const pendingSeats: number[] = [];

  useEffect(() => {
    let active = true;
    api.seats(trip.id)
      .then((result) => {
        if (!active) return;
        const occupied = result.seats.filter((seat) => seat.status === 'occupied').map((seat) => seat.number);
        setOccupiedSeats(occupied);
        setAvailabilitySource('server');
        setSelectedSeats((current) => {
          const stillAvailable = current.filter((seat) => !occupied.includes(seat));
          if (stillAvailable.length) return stillAvailable;
          const firstAvailable = result.seats.find((seat) => seat.status === 'available')?.number;
          return firstAvailable ? [firstAvailable] : [];
        });
      })
      .catch(() => { if (active) setAvailabilitySource('demo'); });
    return () => { active = false; };
  }, [trip.id]);

  const toggleSeat = (seatNum: number) => {
    if (occupiedSeats.includes(seatNum) || pendingSeats.includes(seatNum)) return;

    if (selectedSeats.includes(seatNum)) {
      if (selectedSeats.length === 1) return; // Keep at least one seat
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNum));
    } else {
      if (selectedSeats.length >= 4) return; // Max 4 seats per booking
      setSelectedSeats([...selectedSeats, seatNum].sort((a, b) => a - b));
    }
  };

  const totalPrice = selectedSeats.length * trip.price;

  const getSeatDescription = () => {
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
    const isPending = pendingSeats.includes(seatNum);

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

    if (isPending) {
      return (
        <button
          key={seatNum}
          disabled
          aria-label={`Siège ${seatNum} en cours de réservation`}
          className="h-11 rounded-lg bg-[#eff4ff] text-[#565e74] flex items-center justify-center font-headline text-[13px] font-bold cursor-not-allowed select-none relative border border-[#dce9ff]"
        >
          <span>{String(seatNum).padStart(2, '0')}</span>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse"></span>
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
          className="h-11 rounded-lg bg-[#ff6b00] text-white font-headline text-[13px] font-bold shadow-md ring-2 ring-[#ff6b00]/40 flex flex-col items-center justify-center transition-all scale-105 cursor-pointer"
        >
          <span className="leading-none">{String(seatNum).padStart(2, '0')}</span>
          <span className="material-symbols-outlined text-[13px] font-bold">check</span>
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
          <span className="material-symbols-outlined text-[#216b43] text-[20px]">verified_user</span>
          <p className="font-body text-[12px] leading-snug">
            {availabilitySource === 'server'
              ? 'Disponibilités chargées depuis le serveur. Le verrouillage temporaire commence lorsque vous confirmez la sélection.'
              : availabilitySource === 'demo'
                ? 'Mode démonstration : places indicatives uniquement. Une connexion API est requise pour créer le verrouillage serveur.'
                : 'Vérification des disponibilités auprès du serveur…'}
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
              <span className="px-2 py-0.5 bg-[#a5f0be] text-[#00522e] font-headline text-[10px] rounded-md font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">mode_fan</span>
                VIP Climatisé
              </span>
            </div>
            <span className="font-headline text-[17px] text-[#ff6b00] font-bold">
              {trip.price.toLocaleString('fr-FR')} FCFA
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
                <span className="material-symbols-outlined text-[#ff6b00] text-[15px]">
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

      {/* 3. Route Visual Vignettes */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="relative rounded-xl overflow-hidden shadow-xs h-20 bg-[#eff4ff] border border-[#e2bfb0]/30">
            <img
              src={ASSETS.stationAdjame}
              alt="Gare UTB Adjamé"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/80 via-transparent to-transparent flex items-end p-2">
              <span className="font-headline text-[11px] text-white font-bold">
                Gare UTB Adjamé
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden shadow-xs h-20 bg-[#eff4ff] border border-[#e2bfb0]/30">
            <img
              src={ASSETS.basiliqueYakro}
              alt="Yamoussoukro Centre"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/80 via-transparent to-transparent flex items-end p-2">
              <span className="font-headline text-[11px] text-white font-bold">
                Yamoussoukro Centre
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
              <div className="w-5 h-5 rounded-md bg-[#ff6b00] text-white shadow-xs flex items-center justify-center">
                <span className="material-symbols-outlined text-[13px] font-bold">check</span>
              </div>
              <span className="font-body text-[12px] text-[#0b1c30] font-bold">Votre choix</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#dce9ff] text-[#565e74] flex items-center justify-center">
                <span className="material-symbols-outlined text-[13px]">close</span>
              </div>
              <span className="font-body text-[12px] text-[#565e74]">Occupé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#eff4ff] border border-[#dce9ff] text-[#ff6b00] flex items-center justify-center">
                <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
              </div>
              <span className="font-body text-[12px] text-[#565e74]">En cours (tiers)</span>
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
              <span className="material-symbols-outlined text-[18px]">sensor_door</span>
              <span className="font-headline text-[11px] font-bold">Porte d'accès</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#0b1c30] bg-white px-2.5 py-1 rounded-lg shadow-xs border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[18px] text-[#ff6b00]">sports_score</span>
              <span className="font-headline text-[11px] font-bold">Chauffeur UTB</span>
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
              <span className="material-symbols-outlined text-[14px] text-[#ba1a1a]">emergency</span>
              Issue de secours arrière
            </span>
          </div>
        </div>
      </div>

      {/* 6. Security Reassurance Footnote */}
      <div className="px-4 py-2">
        <div className="bg-[#eff4ff] rounded-2xl p-3 flex items-center gap-2.5 border border-[#dce9ff]">
          <div className="w-8 h-8 rounded-full bg-[#a5f0be] text-[#00522e] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-[11px] font-bold text-[#0b1c30]">
              Paiement Garanti GeniusPay
            </span>
            <span className="font-body text-[11px] text-[#565e74]">
              Wave, Orange Money, MTN MoMo, Moov &amp; CB. Billetterie officielle UTB.
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
              <span className="font-body text-[11px] text-[#216b43] font-bold">
                Sans frais cachés
              </span>
              <span className="font-headline text-[18px] text-[#ff6b00] font-bold">
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          {actionError && <p role="alert" className="p-2 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[11px]">{actionError}</p>}
          <button
            type="button"
            disabled={isBooking || selectedSeats.length === 0}
            onClick={() => onContinueToPayment(selectedSeats, totalPrice)}
            className="w-full min-h-[50px] bg-gradient-to-r from-[#ff6b00] to-[#ff842b] hover:opacity-95 active:scale-[0.98] transition-all text-white font-headline text-[15px] rounded-xl font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            <span className="material-symbols-outlined text-[20px]">{isBooking ? 'progress_activity' : 'lock'}</span>
            <span>{isBooking ? 'Verrouillage des sièges…' : 'Continuer vers le paiement'}</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
