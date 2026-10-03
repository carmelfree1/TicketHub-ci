import React, { useState } from 'react';
import { DigitalTicket } from '../types';
import { ASSETS } from '../data/mockData';

interface DigitalPassScreenProps {
  ticket: DigitalTicket;
  onBackToExplorer: () => void;
}

export const DigitalPassScreen: React.FC<DigitalPassScreenProps> = ({
  ticket,
  onBackToExplorer,
}) => {
  const [copied, setCopied] = useState(false);
  const [pwaSaved, setPwaSaved] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ticket.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSavePwa = () => {
    setPwaSaved(true);
    setTimeout(() => setPwaSaved(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Mon billet TicketHub CI officiel pour ${ticket.departCity} -> ${ticket.arrivalCity} (Siège N°${ticket.seats.join(', ')}) : Code ${ticket.ticketCode}. Départ à ${ticket.departureTime} !`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="flex flex-col w-full pb-16 max-w-md mx-auto">
      <div className="px-4 pt-2 pb-6 flex flex-col gap-3">
        {/* 1. Toast Feedback Webhook Success GeniusPay */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#a5f0be] text-[#002110] shadow-sm border border-[#216b43]/20">
          <div className="w-10 h-10 rounded-full bg-[#216b43] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[22px] fill">verified</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline text-[10px] tracking-wider uppercase text-[#00522e] font-bold">
              GeniusPay Webhook Confirmé
            </span>
            <p className="font-headline text-[14px] font-bold leading-tight truncate">
              Paiement validé avec succès !
            </p>
            <span className="font-body text-[11px] text-[#002110]/80">
              Votre titre de transport officiel est émis et sécurisé.
            </span>
          </div>
        </div>

        {/* 2. Boarding Pass Card (Perforated Metaphor) */}
        <div className="relative flex flex-col w-full rounded-3xl overflow-hidden shadow-lg bg-white border border-[#e2bfb0]/40">
          {/* Top Ticket Header */}
          <div className="p-4 pb-3 bg-[#eff4ff] flex flex-col gap-2 relative border-b border-[#dce9ff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-[#ffdbcc] text-[#a04100] font-headline text-[11px] uppercase tracking-wider font-bold border border-[#ffb693]">
                  {ticket.carrier}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#0b1c30] font-headline text-[10px] font-bold">
                  {ticket.category}
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a5f0be] text-[#00522e] shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#216b43] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#216b43]"></span>
                </span>
                <span className="font-headline text-[10px] font-bold tracking-wide uppercase">
                  Actif &amp; Valide
                </span>
              </div>
            </div>

            {/* Trajet & Stations */}
            <div className="mt-1 flex flex-col">
              <div className="flex items-baseline justify-between text-[#0b1c30]">
                <div className="flex flex-col">
                  <span className="font-headline text-[22px] font-bold tracking-tight leading-tight">
                    {ticket.departCity}
                  </span>
                  <span className="font-body text-[11px] text-[#5a4136] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#ff6b00]">
                      location_on
                    </span>
                    {ticket.departStation}
                  </span>
                </div>

                <div className="flex flex-col items-center px-1">
                  <span className="material-symbols-outlined text-[#ff6b00] text-[24px]">
                    arrow_right_alt
                  </span>
                  <span className="font-headline text-[10px] text-[#5a4136] font-bold">
                    {ticket.duration}
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span className="font-headline text-[22px] font-bold tracking-tight text-right leading-tight">
                    {ticket.arrivalCity}
                  </span>
                  <span className="font-body text-[11px] text-[#5a4136] flex items-center gap-1">
                    {ticket.arrivalStation}
                    <span className="material-symbols-outlined text-[15px] text-[#ff6b00]">
                      pin_drop
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-headline text-[10px] text-[#5a4136] uppercase font-bold">
                Réf. Billet
              </span>
              <span className="font-headline text-[11px] font-bold tracking-wider text-[#0b1c30] bg-white px-2 py-0.5 rounded border border-[#dce9ff]">
                {ticket.commandRef}
              </span>
            </div>
          </div>

          {/* Perforation Line with Authentic Inner Notches */}
          <div className="relative w-full h-6 flex items-center justify-center bg-[#eff4ff] overflow-hidden">
            <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-[#f8f9ff] shadow-inner border-r border-[#e2bfb0]/40"></div>
            <div className="w-full mx-5 border-b-2 border-dashed border-[#e2bfb0]/70"></div>
            <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-[#f8f9ff] shadow-inner border-l border-[#e2bfb0]/40"></div>
          </div>

          {/* Ticket Body: Metadata & Passenger */}
          <div className="p-4 flex flex-col gap-3 bg-white">
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
              <div className="flex flex-col">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase">
                  Passager
                </span>
                <span className="font-headline text-[14px] font-bold text-[#0b1c30] truncate">
                  {ticket.passengerName}
                </span>
                <span className="font-body text-[11px] text-[#5a4136]">
                  {ticket.passengerPhone}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase">
                  Date de départ
                </span>
                <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
                  {ticket.departureDate}
                </span>
                <span className="font-body text-[11px] text-[#ff6b00] font-bold">
                  Départ {ticket.departureTime} (Emb. {ticket.boardingTime})
                </span>
              </div>
            </div>

            {/* 3 Metric Badges */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase block">
                  Siège
                </span>
                <span className="font-headline text-[17px] font-bold text-[#ff6b00]">
                  N° {ticket.seats.join(', ')}
                </span>
                <span className="font-body text-[10px] text-[#5a4136] block">Fenêtre, R4</span>
              </div>

              <div className="p-2 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase block">
                  Confort
                </span>
                <span className="font-headline text-[15px] font-bold text-[#0b1c30] mt-0.5 block">
                  VIP
                </span>
                <span className="font-body text-[10px] text-[#216b43] font-bold block">
                  Climatisé + Wifi
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase block">
                  Payé Wave
                </span>
                <span className="font-headline text-[15px] font-bold text-[#0b1c30] mt-0.5 block">
                  {ticket.price.toLocaleString('fr-FR')} F
                </span>
                <span className="font-body text-[10px] text-[#5a4136] block">Quittance TTC</span>
              </div>
            </div>

            {/* DYNAMIC QR CODE WITH HOLOGRAPHIC SCANNER */}
            <div className="relative mt-1 p-4 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex flex-col items-center text-center overflow-hidden">
              {/* Scan Laser effect */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent animate-scan-laser pointer-events-none shadow-[0_0_12px_#ff6b00]"></div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#0b1c30] shadow-xs mb-3 border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[16px] text-[#216b43]">
                  verified_user
                </span>
                <span className="font-headline text-[10px] uppercase tracking-wider font-bold">
                  HMAC-SHA256 Token Certifié
                </span>
              </div>

              {/* High-Res Vector SVG QR Code with Center TKH Brand Badge */}
              <div className="relative p-3 rounded-2xl bg-white shadow-md flex items-center justify-center border border-[#dce9ff]">
                <svg
                  className="w-48 h-48"
                  viewBox="0 0 160 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="160" height="160" rx="8" fill="white" />
                  {/* Top-Left Finder */}
                  <rect x="12" y="12" width="36" height="36" rx="4" fill="#0B1C30" />
                  <rect x="18" y="18" width="24" height="24" rx="2" fill="white" />
                  <rect x="24" y="24" width="12" height="12" rx="1" fill="#FF6B00" />

                  {/* Top-Right Finder */}
                  <rect x="112" y="12" width="36" height="36" rx="4" fill="#0B1C30" />
                  <rect x="118" y="18" width="24" height="24" rx="2" fill="white" />
                  <rect x="124" y="24" width="12" height="12" rx="1" fill="#FF6B00" />

                  {/* Bottom-Left Finder */}
                  <rect x="12" y="112" width="36" height="36" rx="4" fill="#0B1C30" />
                  <rect x="18" y="118" width="24" height="24" rx="2" fill="white" />
                  <rect x="24" y="124" width="12" height="12" rx="1" fill="#FF6B00" />

                  {/* Data Matrix Modules */}
                  <g fill="#0B1C30">
                    <rect x="54" y="14" width="8" height="8" rx="1" />
                    <rect x="68" y="14" width="8" height="8" rx="1" />
                    <rect x="82" y="14" width="8" height="8" rx="1" />
                    <rect x="96" y="14" width="8" height="8" rx="1" />
                    <rect x="54" y="28" width="14" height="6" rx="1" />
                    <rect x="76" y="28" width="18" height="6" rx="1" />
                    <rect x="14" y="54" width="8" height="8" rx="1" />
                    <rect x="28" y="54" width="8" height="8" rx="1" />
                    <rect x="14" y="68" width="6" height="14" rx="1" />
                    <rect x="28" y="80" width="14" height="6" rx="1" />
                    <rect x="14" y="96" width="14" height="8" rx="1" />
                    <rect x="54" y="54" width="10" height="10" rx="1" />
                    <rect x="70" y="54" width="6" height="12" rx="1" />
                    <rect x="84" y="50" width="12" height="6" rx="1" />
                    <rect x="102" y="54" width="16" height="8" rx="1" />
                    <rect x="126" y="54" width="8" height="8" rx="1" />
                    <rect x="140" y="66" width="8" height="14" rx="1" />
                    <rect x="126" y="86" width="14" height="8" rx="1" />
                    <rect x="100" y="70" width="10" height="10" rx="1" />
                    <rect x="52" y="96" width="14" height="8" rx="1" />
                    <rect x="72" y="94" width="8" height="12" rx="1" />
                    <rect x="88" y="96" width="14" height="8" rx="1" />
                    <rect x="110" y="96" width="10" height="8" rx="1" />
                    <rect x="128" y="102" width="12" height="12" rx="1" />
                    <rect x="54" y="114" width="8" height="8" rx="1" />
                    <rect x="70" y="114" width="18" height="8" rx="1" />
                    <rect x="96" y="114" width="8" height="18" rx="1" />
                    <rect x="112" y="122" width="14" height="8" rx="1" />
                    <rect x="132" y="122" width="14" height="8" rx="1" />
                    <rect x="54" y="130" width="12" height="12" rx="1" />
                    <rect x="74" y="130" width="12" height="12" rx="1" />
                    <rect x="112" y="136" width="8" height="12" rx="1" />
                    <rect x="128" y="138" width="18" height="8" rx="1" />
                  </g>

                  {/* TicketHub Center Medallion */}
                  <circle cx="80" cy="80" r="16" fill="white" stroke="#E2BFB0" strokeWidth="2" />
                  <circle cx="80" cy="80" r="13" fill="#A04100" />
                  <text
                    x="80"
                    y="84"
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="Space Grotesk, sans-serif"
                  >
                    TKH
                  </text>
                </svg>
              </div>

              {/* Alphanumeric Backup Code */}
              <div className="mt-3 flex flex-col items-center">
                <span className="font-body text-[11px] text-[#5a4136]">
                  Code alphanumérique de secours :
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-headline text-[18px] tracking-widest text-[#ff6b00] font-bold select-all font-mono">
                    {ticket.ticketCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label="Copier le code de billet"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-[#dce9ff] text-[#0b1c30] shadow-xs active:scale-95 transition-transform cursor-pointer border border-[#dce9ff]"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
                {copied && (
                  <span className="font-body text-[10px] text-[#216b43] font-bold mt-0.5">
                    Code copié dans le presse-papier !
                  </span>
                )}
                <p className="font-body text-[11px] text-[#5a4136] mt-1 max-w-[280px]">
                  Contrôle numérique avec jeton anti-rejeu. Présentez cet écran directement à l'embarquement.
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Footing with Timestamp */}
          <div className="px-4 py-2 bg-[#eff4ff] text-[#5a4136] flex items-center justify-between text-[11px] border-t border-[#dce9ff]">
            <span className="flex items-center gap-1 font-body text-[11px] text-[#216b43] font-bold">
              <span className="material-symbols-outlined text-[15px]">network_ping</span>
              PWA Sync : Hors-ligne prêt
            </span>
            <span className="font-body text-[11px]">{ticket.issuedAt}</span>
          </div>
        </div>

        {/* 3. PWA & Sharing Actions */}
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={handleSavePwa}
            className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl font-headline text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer ${
              pwaSaved
                ? 'bg-[#216b43] text-white'
                : 'bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {pwaSaved ? 'check_circle' : 'download_for_offline'}
            </span>
            <span>
              {pwaSaved
                ? 'Billet mémorisé en cache hors-ligne !'
                : 'Sauvegarder Hors-ligne (PWA Cache) & PDF'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#e2bfb0]/40 text-[#0b1c30] font-headline text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#eff4ff] active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#216b43]">
                share
              </span>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setCalendarAdded(true)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#e2bfb0]/40 text-[#0b1c30] font-headline text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#eff4ff] active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#ff6b00]">
                {calendarAdded ? 'event_available' : 'calendar_month'}
              </span>
              <span>{calendarAdded ? 'Ajouté !' : 'Ajouter Calendrier'}</span>
            </button>
          </div>
        </div>

        {/* 4. Boarding Instructions & Map */}
        <div className="p-4 rounded-2xl bg-white border border-[#e2bfb0]/30 flex flex-col gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-[#ff6b00]">
                directions_bus
              </span>
              <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
                Instructions d'embarquement
              </span>
            </div>
            <span className="font-headline text-[10px] text-[#216b43] font-bold uppercase tracking-wider bg-[#a5f0be] px-2 py-0.5 rounded-full">
              {ticket.quai}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 font-body text-[12px] text-[#0b1c30]">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[17px] text-[#5a4136] flex-shrink-0 mt-0.5">
                schedule
              </span>
              <span>
                Présentez-vous à la <strong className="font-bold">Gare UTB Adjamé</strong> au plus tard à{' '}
                <strong className="font-bold text-[#ff6b00]">08:00</strong> avec une pièce d'identité originale.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[17px] text-[#5a4136] flex-shrink-0 mt-0.5">
                luggage
              </span>
              <span>1 bagage en soute inclus (max 25 kg) + 1 bagage à main en cabine.</span>
            </div>
          </div>

          {/* Access Map Visual */}
          <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-xs mt-1 border border-[#dce9ff]">
            <img
              src={ASSETS.mapAdjame}
              alt="Carte d'accès Gare UTB Adjamé"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/85 via-transparent to-transparent flex items-end p-2.5 justify-between">
              <div className="flex flex-col text-white">
                <span className="font-headline text-[12px] font-bold">
                  Gare UTB Adjamé Renault
                </span>
                <span className="font-body text-[10px] opacity-90">
                  Boulevard Nangui Abrogoua, Abidjan
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    'https://www.google.com/maps/search/?api=1&query=Gare+UTB+Adjame+Abidjan',
                    '_blank'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white text-[#0b1c30] font-headline text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-[#ff6b00]">
                  navigation
                </span>
                <span>Itinéraire</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Support 24/7 Assistance */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#e2bfb0]/30 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#ffdbcc] text-[#a04100] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[13px] font-bold text-[#0b1c30]">
                Besoin d'assistance ?
              </span>
              <span className="font-body text-[11px] text-[#5a4136]">
                Support TicketHub CI disponible 24/7
              </span>
            </div>
          </div>
          <a
            href="tel:+2250700000000"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#eff4ff] text-[#ff6b00] border border-[#dce9ff] shadow-xs active:scale-95 transition-transform cursor-pointer"
            aria-label="Appeler le support"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
          </a>
        </div>

        {/* Back to Explorer action */}
        <button
          type="button"
          onClick={onBackToExplorer}
          className="w-full py-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[13px] font-bold hover:bg-[#dce9ff] transition-colors border border-[#dce9ff] cursor-pointer"
        >
          Retour à l'accueil Explorer
        </button>
      </div>
    </div>
  );
};
