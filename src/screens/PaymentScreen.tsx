import React, { useState, useEffect } from 'react';
import { TripDeparture, PaymentMethodId } from '../types';

interface PaymentScreenProps {
  trip: TripDeparture;
  selectedSeats: number[];
  totalAmount: number;
  onPaymentSuccess: () => void;
  onBack: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  trip,
  selectedSeats,
  totalAmount,
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('wave');
  const [phoneNumber, setPhoneNumber] = useState('07 88 45 12 30');
  const [remainingSeconds, setRemainingSeconds] = useState(8 * 60 + 11);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const operatorInfo: Record<
    PaymentMethodId,
    { name: string; tag?: string; subtitle: string; icon: string; instruction: React.ReactNode; isMomo: boolean }
  > = {
    wave: {
      name: 'Wave Mobile Money',
      tag: 'Recommandé',
      subtitle: 'Validation push instantanée • 0% de frais',
      icon: 'contactless',
      isMomo: true,
      instruction: (
        <span>
          Vous recevrez une <strong className="font-bold text-[#0b1c30]">notification push instantanée</strong> sur votre application <strong className="font-bold text-[#ff6b00]">Wave</strong> pour autoriser le débit sécurisé de <strong className="font-bold text-[#0b1c30]">{totalAmount.toLocaleString('fr-FR')} FCFA</strong>.
        </span>
      ),
    },
    orange: {
      name: 'Orange Money',
      tag: 'CI',
      subtitle: 'Code secret via prompt USSD #144#',
      icon: 'phone_android',
      isMomo: true,
      instruction: (
        <span>
          Composez <strong className="font-bold text-[#ff6b00]">#144*82#</strong> pour générer votre code d'autorisation temporaire ou attendez le prompt USSD automatique sur votre mobile.
        </span>
      ),
    },
    mtn: {
      name: 'MTN MoMo',
      subtitle: 'Validation rapide via prompt direct *133#',
      icon: 'signal_cellular_alt',
      isMomo: true,
      instruction: (
        <span>
          Un prompt direct <strong className="font-bold text-[#0b1c30]">MTN MoMo</strong> va s'afficher sur votre écran. Saisissez votre code PIN secret pour confirmer.
        </span>
      ),
    },
    moov: {
      name: 'Moov Money',
      subtitle: 'Paiement sécurisé Flooz / Moov',
      icon: 'account_balance_wallet',
      isMomo: true,
      instruction: (
        <span>
          Un message de confirmation <strong className="font-bold text-[#0b1c30]">Moov Flooz</strong> vous sera envoyé pour finaliser le débit sécurisé.
        </span>
      ),
    },
    cb: {
      name: 'Carte Bancaire',
      subtitle: 'Visa, Mastercard • 3D-Secure 2.0',
      icon: 'credit_card',
      isMomo: false,
      instruction: (
        <span>
          Vous serez redirigé vers la passerelle sécurisée <strong className="font-bold text-[#216b43]">GeniusPay 3D-Secure 2.0</strong> pour saisir les numéros de votre carte bancaire.
        </span>
      ),
    },
  };

  const handleStartPayment = () => {
    setIsProcessing(true);
    setProcessingStep(1);

    // Simulate real webhook communication and confirmation
    setTimeout(() => {
      setProcessingStep(2);
    }, 1600);

    setTimeout(() => {
      onPaymentSuccess();
    }, 3200);
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
                  {trip.carrier}
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  • Ligne Interurbaine
                </span>
              </div>
              <span className="font-headline text-[10px] text-[#a04100] font-bold bg-[#ffdbcc] px-2 py-0.5 rounded border border-[#ffb693]">
                CMD-2024-84920
              </span>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col">
                <span className="font-headline text-[18px] text-[#0b1c30] font-bold leading-tight">
                  {trip.departCity}
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  {trip.departStation}
                </span>
              </div>

              <div className="flex flex-col items-center px-2">
                <span className="material-symbols-outlined text-[#ff6b00] text-[20px]">
                  trending_flat
                </span>
                <span className="font-headline text-[10px] text-[#216b43] font-bold">
                  Direct A3
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-headline text-[18px] text-[#0b1c30] font-bold leading-tight">
                  {trip.arrivalCity}
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  {trip.arrivalStation}
                </span>
              </div>
            </div>

            {/* Meta tags row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#5a4136]">
                  airline_seat_recline_extra
                </span>
                <span className="font-headline text-[12px] text-[#0b1c30] font-bold">
                  {selectedSeats.length === 1
                    ? `Siège ${selectedSeats[0]}`
                    : `Sièges ${selectedSeats.join(', ')}`}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#5a4136]">
                  calendar_today
                </span>
                <span className="font-body text-[12px] text-[#0b1c30] font-medium">
                  Aujourd'hui, {trip.departTime}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#5a4136]">
                  person
                </span>
                <span className="font-body text-[12px] text-[#0b1c30] font-medium">
                  {selectedSeats.length} Passager{selectedSeats.length > 1 ? 's' : ''}
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

        {/* 5. Phone Input & Instructions Box */}
        {operatorInfo[selectedMethod].isMomo && (
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#e2bfb0]/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="momo-phone"
                className="font-headline text-[13px] text-[#0b1c30] font-bold"
              >
                Numéro de débit Mobile Money
              </label>
              <span className="font-headline text-[10px] text-[#216b43] font-bold uppercase tracking-wider bg-[#a5f0be]/30 px-2 py-0.5 rounded-full border border-[#a5f0be]">
                Compte vérifié
              </span>
            </div>

            <div className="relative flex items-center w-full">
              {/* CI Flag and Country Code prefix */}
              <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none select-none">
                <span className="inline-flex items-center justify-center w-5 h-3.5 rounded-xs overflow-hidden shadow-xs border border-black/10">
                  <span className="w-1/3 h-full bg-[#f77f00]"></span>
                  <span className="w-1/3 h-full bg-[#ffffff]"></span>
                  <span className="w-1/3 h-full bg-[#009e49]"></span>
                </span>
                <span className="font-headline text-[14px] text-[#0b1c30] font-bold">
                  +225
                </span>
                <span className="w-px h-5 bg-[#e2bfb0] ml-1"></span>
              </div>

              <input
                id="momo-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="00 00 00 00 00"
                className="w-full h-12 pl-24 pr-10 bg-[#eff4ff] rounded-xl font-headline text-[16px] text-[#0b1c30] font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#ff6b00] border border-[#dce9ff] transition-all"
              />

              {phoneNumber && (
                <button
                  type="button"
                  aria-label="Effacer le numéro"
                  onClick={() => setPhoneNumber('')}
                  className="absolute right-3 w-6 h-6 rounded-full bg-[#dce9ff] flex items-center justify-center text-[#5a4136] hover:text-[#0b1c30] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Dynamic Explanatory Instruction Box */}
            <div className="flex items-start gap-2.5 bg-[#eff4ff] p-3 rounded-xl border border-[#dce9ff]">
              <span className="material-symbols-outlined text-[#216b43] text-[20px] flex-shrink-0 mt-0.5">
                notifications_active
              </span>
              <p className="font-body text-[12px] text-[#0b1c30] leading-snug">
                {operatorInfo[selectedMethod].instruction}
              </p>
            </div>
          </div>
        )}

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
              <span>Tarif billet transporteur ({trip.carrier})</span>
              <span className="text-[#0b1c30] font-bold">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="flex justify-between items-center text-[#5a4136]">
              <div className="flex items-center gap-1">
                <span>Frais de service plateforme TicketHub</span>
                <span className="material-symbols-outlined text-[14px] text-[#565e74]">info</span>
              </div>
              <span className="text-[#216b43] font-bold">
                0 FCFA <span className="text-[10px] font-normal uppercase">(Offerts)</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-[#5a4136]">
              <span>Frais de passerelle GeniusPay</span>
              <span className="text-[#216b43] font-bold">Inclus (0 FCFA)</span>
            </div>
          </div>

          <div className="w-full h-px bg-[#eff4ff] my-1"></div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-headline text-[14px] text-[#0b1c30] font-bold">
                Total net débité
              </span>
              <span className="font-body text-[11px] text-[#5a4136]">
                Aucun frais caché à la confirmation
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
          <button
            type="button"
            onClick={handleStartPayment}
            className="w-full h-14 bg-gradient-to-r from-[#ff6b00] to-[#ff842b] active:scale-[0.98] transition-transform rounded-2xl flex items-center justify-between px-5 shadow-lg shadow-[#ff6b00]/25 text-white font-headline text-[16px] font-bold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
              <span>
                Payer {totalAmount.toLocaleString('fr-FR')} FCFA avec {operatorInfo[selectedMethod].name}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </div>
          </button>

          <p className="font-body text-[11px] text-center text-[#5a4136]">
            En confirmant, vous acceptez les CGV de TicketHub CI &amp; de l'opérateur {trip.carrier}.
          </p>
        </div>
      </div>

      {/* 9. Processing Overlay Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-[#0b1c30]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 transition-opacity duration-300">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#dce9ff] border-t-[#ff6b00] animate-spin"></div>
              <span className="material-symbols-outlined text-[#ff6b00] text-[28px]">
                lock_clock
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-headline text-[20px] text-[#0b1c30] font-bold">
                {processingStep === 1 ? 'Demande envoyée !' : 'Paiement confirmé !'}
              </h3>
              <p className="font-body text-[13px] text-[#5a4136] leading-relaxed">
                {processingStep === 1 ? (
                  <>
                    Veuillez autoriser le débit sur votre application{' '}
                    <strong className="font-bold text-[#ff6b00]">
                      {operatorInfo[selectedMethod].name}
                    </strong>{' '}
                    au <strong className="font-bold text-[#0b1c30]">{phoneNumber}</strong>.
                  </>
                ) : (
                  <>
                    Transaction validée par <strong className="font-bold text-[#216b43]">GeniusPay</strong>. Émission de votre billet officiel...
                  </>
                )}
              </p>
            </div>

            {/* Live status tracker indicator */}
            <div className="w-full bg-[#eff4ff] p-3 rounded-2xl flex items-center gap-2.5 text-left border border-[#dce9ff]">
              <span className="w-3 h-3 rounded-full bg-[#216b43] animate-ping flex-shrink-0"></span>
              <div className="flex flex-col min-w-0">
                <span className="font-headline text-[12px] text-[#0b1c30] font-bold">
                  {processingStep === 1 ? "En attente d'idempotence" : 'Webhook exécuté avec succès'}
                </span>
                <span className="font-body text-[10px] text-[#5a4136] truncate">
                  ID session: GP-CI-84920-{selectedMethod.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsProcessing(false)}
              className="w-full py-2.5 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[13px] font-bold hover:bg-[#dce9ff] transition-colors cursor-pointer"
            >
              Modifier le mode de paiement
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
