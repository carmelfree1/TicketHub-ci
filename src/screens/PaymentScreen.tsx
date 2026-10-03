import React, { useState, useEffect } from 'react';
import { TripDeparture, PaymentMethodId, TicketCategory, TicketedEvent } from '../types';

interface PaymentScreenProps {
  trip: TripDeparture;
  selectedSeats: number[];
  totalAmount: number;
  bookingId: string;
  holdExpiresAt: string;
  event?: TicketedEvent;
  eventCategory?: TicketCategory;
  eventQuantity?: number;
  onStartPayment: (method: PaymentMethodId) => Promise<void>;
  onBack: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  trip,
  selectedSeats,
  totalAmount,
  bookingId,
  holdExpiresAt,
  event,
  eventCategory,
  eventQuantity = 1,
  onStartPayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('wave');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const purchaseTitle = event?.title || trip.carrier;
  const originLabel = event?.city || trip.departCity;
  const originDetails = event?.venue || trip.departStation;
  const destinationLabel = event?.city || trip.arrivalCity;
  const destinationDetails = event?.venue || trip.arrivalStation;
  const purchaseTime = event
    ? new Date(event.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : trip.departTime;
  const purchaseDate = event
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(event.startsAt))
    : trip.departAt
      ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(trip.departAt))
      : 'Date du départ';
  const purchaseQuantity = event ? eventQuantity : selectedSeats.length;

  useEffect(() => {
    const expiresAt = new Date(holdExpiresAt).getTime();
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [holdExpiresAt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const operatorInfo: Record<
    PaymentMethodId,
    { name: string; tag?: string; subtitle: string; icon: string; instruction: React.ReactNode }
  > = {
    wave: {
      name: 'Wave Mobile Money',
      tag: 'Recommandé',
      subtitle: 'Paiement Mobile Money via le checkout sécurisé',
      icon: 'contactless',
      instruction: <span>Vous serez redirigé vers le checkout GeniusPay pour confirmer le paiement Wave.</span>,
    },
    orange: {
      name: 'Orange Money',
      tag: 'CI',
      subtitle: 'Paiement Orange Money via le checkout sécurisé',
      icon: 'phone_android',
      instruction: <span>Le checkout GeniusPay vous indiquera les étapes Orange Money disponibles pour cette transaction.</span>,
    },
    mtn: {
      name: 'MTN MoMo',
      subtitle: 'Paiement MTN MoMo via le checkout sécurisé',
      icon: 'signal_cellular_alt',
      instruction: <span>Le checkout GeniusPay vous guidera pour valider votre paiement MTN MoMo.</span>,
    },
    moov: {
      name: 'Moov Money',
      subtitle: 'Paiement sécurisé Flooz / Moov',
      icon: 'account_balance_wallet',
      instruction: <span>Le checkout hébergé présente les moyens de paiement actuellement disponibles pour votre compte.</span>,
    },
    cb: {
      name: 'Carte Bancaire',
      subtitle: 'Visa, Mastercard • 3D-Secure 2.0',
      icon: 'credit_card',
      instruction: <span>Le checkout GeniusPay indiquera les cartes et étapes de validation disponibles.</span>,
    },
  };

  const handleStartPayment = async () => {
    if (remainingSeconds <= 0) {
      setPaymentError('La réservation a expiré. Retournez choisir vos places ou billets.');
      return;
    }
    setPaymentError('');
    setIsProcessing(true);
    try {
      await onStartPayment(selectedMethod);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Impossible de démarrer le paiement.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 max-w-md mx-auto">
      {/* 1. Session Expiration Countdown Banner */}
      <div
        className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors duration-500 border-b ${
          remainingSeconds < 120
            ? 'bg-[#ffdad6] border-[#ba1a1a]/30'
            : 'bg-[#dce9ff] border-[#cbdbf5]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`material-symbols-outlined text-[20px] animate-pulse flex-shrink-0 ${
              remainingSeconds < 120 ? 'text-[#ba1a1a]' : 'text-[#ff6b00]'
            }`}
          >
            timer
          </span>
          <span className="font-headline text-[12px] text-[#0b1c30] font-bold truncate">
            Session réservée temporairement
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full shadow-xs flex-shrink-0 border border-[#cbdbf5]">
          <span className="font-body text-[11px] text-[#5a4136] font-medium">Expire dans</span>
          <span
            className={`font-headline text-[13px] font-bold leading-none tabular-nums ${
              remainingSeconds < 120 ? 'text-[#ba1a1a]' : 'text-[#ff6b00]'
            }`}
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>
      </div>

      <div className="px-4 pt-3 flex flex-col gap-3">
        {/* 2. Order Summary Card (Perforated Pass Metaphor) */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-[#e2bfb0]/30 overflow-hidden flex flex-col">
          {/* Top Ticket Section */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <span className="bg-[#eff4ff] text-[#0b1c30] px-2.5 py-0.5 rounded-full font-headline text-[11px] font-bold tracking-wider uppercase border border-[#dce9ff]">
                  {purchaseTitle}
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  • {event ? (event.eventType === 'sport' ? 'Événement sportif' : 'Billet événementiel') : 'Transport interurbain'}
                </span>
              </div>
              <span className="font-headline text-[10px] text-[#a04100] font-bold bg-[#ffdbcc] px-2 py-0.5 rounded border border-[#ffb693]">
                CMD-{bookingId.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col">
                <span className="font-headline text-[18px] text-[#0b1c30] font-bold leading-tight">
                  {originLabel}
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  {originDetails}
                </span>
              </div>

              <div className="flex flex-col items-center px-2">
                <span className="material-symbols-outlined text-[#ff6b00] text-[20px]">
                  trending_flat
                </span>
                <span className="font-headline text-[10px] text-[#216b43] font-bold">
                  {eventCategory?.name || trip.serviceTitle || 'Trajet direct'}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-headline text-[18px] text-[#0b1c30] font-bold leading-tight">
                  {destinationLabel}
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  {destinationDetails}
                </span>
              </div>
            </div>

            {/* Meta tags row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#5a4136]">
                  {event ? 'confirmation_number' : 'airline_seat_recline_extra'}
                </span>
                <span className="font-headline text-[12px] text-[#0b1c30] font-bold">
                  {event
                    ? `${eventCategory?.name || 'Billet'} · ${purchaseQuantity} billet${purchaseQuantity > 1 ? 's' : ''}`
                    : selectedSeats.length === 1 ? `Siège ${selectedSeats[0]}` : `Sièges ${selectedSeats.join(', ')}`}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#5a4136]">
                  calendar_today
                </span>
                <span className="font-body text-[12px] text-[#0b1c30] font-medium">
                  {purchaseDate} · {purchaseTime}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#5a4136]">
                  person
                </span>
                <span className="font-body text-[12px] text-[#0b1c30] font-medium">
                  {purchaseQuantity} {event ? 'billet(s)' : `passager${purchaseQuantity > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Perforated Cutout Divider */}
          <div className="relative w-full flex items-center justify-between py-1 bg-white">
            <div className="w-4 h-7 bg-[#f8f9ff] rounded-r-full shadow-inner -ml-2 border-r border-[#e2bfb0]/30"></div>
            <div className="flex-1 border-t-2 border-dashed border-[#e2bfb0]/60 mx-2"></div>
            <div className="w-4 h-7 bg-[#f8f9ff] rounded-l-full shadow-inner -mr-2 border-l border-[#e2bfb0]/30"></div>
          </div>

          {/* Ticket Bottom Info: Amount */}
          <div className="px-4 py-2.5 bg-[#eff4ff] flex items-center justify-between border-t border-[#dce9ff]">
            <span className="font-headline text-[13px] text-[#5a4136] font-bold">
              Total à régler
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-[22px] text-[#ff6b00] font-bold">
                {totalAmount.toLocaleString('fr-FR')}
              </span>
              <span className="font-headline text-[12px] text-[#ff6b00] font-bold">
                FCFA
              </span>
            </div>
          </div>
        </div>

        {/* 3. GeniusPay Trust Badge */}
        <div className="w-full bg-white rounded-2xl p-3 shadow-xs border border-[#e2bfb0]/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-center flex-shrink-0 text-[#ff6b00]">
              <span className="material-symbols-outlined text-[20px] fill">verified_user</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-headline text-[13px] text-[#0b1c30] font-bold leading-tight">
                  GeniusPay Verified Checkout
                </span>
                <span className="bg-[#a5f0be] text-[#00522e] text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase leading-none">
                  Certifié
                </span>
              </div>
              <span className="font-body text-[11px] text-[#5a4136] truncate leading-tight mt-0.5">
                Paiement 100% Chiffré TLS/HTTPS &amp; Idempotent
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#216b43] text-[22px] flex-shrink-0">
            lock
          </span>
        </div>

        {/* 4. Payment Methods Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[15px] text-[#0b1c30] font-bold">
              Mode de paiement
            </span>
            <span className="font-headline text-[11px] text-[#216b43] font-bold flex items-center gap-0.5 bg-[#a5f0be]/30 px-2 py-0.5 rounded-full border border-[#a5f0be]">
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              0 frais opérateur
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {(['wave', 'orange', 'mtn', 'moov', 'cb'] as PaymentMethodId[]).map((methodId) => {
              const op = operatorInfo[methodId];
              const isSelected = selectedMethod === methodId;

              return (
                <label
                  key={methodId}
                  onClick={() => setSelectedMethod(methodId)}
                  className={`cursor-pointer relative rounded-2xl p-3 shadow-xs transition-all duration-200 flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#ffdbcc]/40 border-[#ff6b00] ring-1 ring-[#ff6b00]/30'
                      : 'bg-white border-[#e2bfb0]/30 hover:border-[#cbdbf5]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={methodId}
                    checked={isSelected}
                    onChange={() => setSelectedMethod(methodId)}
                    className="hidden"
                  />

                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border ${
                        isSelected
                          ? 'bg-[#ffdbcc] text-[#a04100] border-[#ffb693]'
                          : 'bg-[#eff4ff] text-[#5a4136] border-[#dce9ff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px]">
                        {op.icon}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline text-[14px] text-[#0b1c30] font-bold">
                          {op.name}
                        </span>
                        {op.tag && (
                          <span className="bg-[#a5f0be] text-[#00522e] text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase leading-none">
                            {op.tag}
                          </span>
                        )}
                      </div>
                      <span className="font-body text-[11px] text-[#5a4136] truncate">
                        {op.subtitle}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-[#ff6b00] border-[#ff6b00]'
                        : 'bg-[#eff4ff] border-[#cbdbf5]'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Checkout information */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#e2bfb0]/30 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#216b43] text-[20px] flex-shrink-0">verified_user</span>
          <p className="font-body text-[12px] text-[#0b1c30] leading-snug">
            {operatorInfo[selectedMethod].instruction} Le code PIN Mobile Money ne doit être saisi que dans l’application ou le checkout officiel de l’opérateur.
          </p>
        </div>

        {/* 6. Transparent Fee Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#e2bfb0]/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[13px] text-[#0b1c30] font-bold">
              Détail de la facturation
            </span>
            <span className="font-headline text-[10px] text-[#00522e] bg-[#a5f0be] px-2 py-0.5 rounded-full font-bold uppercase">
              Transparence totale
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-1 font-body text-[12px]">
            <div className="flex justify-between items-center text-[#5a4136]">
              <span>{event ? 'Billets événement' : `Tarif transporteur (${trip.carrier})`}</span>
              <span className="text-[#0b1c30] font-bold">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="flex justify-between items-center text-[#5a4136]">
              <div className="flex items-center gap-1">
                <span>Frais de service plateforme TicketHub</span>
                <span className="material-symbols-outlined text-[14px] text-[#565e74]">info</span>
              </div>
              <span className="text-[#5a4136] font-bold">Selon les conditions affichées</span>
            </div>

            <div className="flex justify-between items-center text-[#5a4136]">
              <span>Frais de passerelle GeniusPay</span>
              <span className="text-[#5a4136] font-bold">Confirmés avant autorisation</span>
            </div>
          </div>

          <div className="w-full h-px bg-[#eff4ff] my-1"></div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-headline text-[14px] text-[#0b1c30] font-bold">
                Montant de la réservation
              </span>
              <span className="font-body text-[11px] text-[#5a4136]">
                Les frais éventuels seront indiqués par GeniusPay avant paiement
              </span>
            </div>
            <span className="font-headline text-[18px] text-[#ff6b00] font-bold">
              {totalAmount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* 7. Security Footnote */}
        <div className="flex items-center justify-center gap-1.5 p-2 bg-[#eff4ff] rounded-xl text-center border border-[#dce9ff]">
          <span className="material-symbols-outlined text-[#216b43] text-[16px] flex-shrink-0">
            verified
          </span>
          <span className="font-body text-[11px] text-[#5a4136]">
            Validation atomique côté serveur • Webhook GeniusPay idempotent
          </span>
        </div>

        {/* 8. Pay Action CTA */}
        <div className="pt-1 flex flex-col gap-2">
          {paymentError && <p role="alert" className="p-3 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[12px]">{paymentError}</p>}
          <button
            type="button"
            onClick={handleStartPayment}
            disabled={isProcessing || remainingSeconds <= 0}
            className="w-full h-14 bg-gradient-to-r from-[#ff6b00] to-[#ff842b] active:scale-[0.98] transition-transform rounded-2xl flex items-center justify-between px-5 shadow-lg shadow-[#ff6b00]/25 text-white font-headline text-[15px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
              <span>
                {isProcessing ? 'Ouverture du checkout…' : `Continuer vers le checkout GeniusPay`}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
          </button>

          <p className="font-body text-[11px] text-center text-[#5a4136]">
            Vous serez redirigé vers le checkout hébergé. Ne partagez jamais votre code PIN dans TicketHub.
          </p>
        </div>
      </div>

      {isProcessing && (
        <div role="status" className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl bg-[#0b1c30] p-3 text-white shadow-xl flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="font-body text-[12px]">Connexion au checkout hébergé…</span>
        </div>
      )}
    </div>
  );
};
