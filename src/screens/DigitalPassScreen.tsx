import React, { useState } from 'react';
import { DigitalTicket } from '../types';
import { ASSETS } from '../data/mockData';
import { QRCodeSVG } from 'qrcode.react';

interface DigitalPassScreenProps {
  ticket: DigitalTicket;
  onBackToExplorer: () => void;
}

export const DigitalPassScreen: React.FC<DigitalPassScreenProps> = ({
  ticket,
  onBackToExplorer,
}) => {
  const isEvent = ticket.productType === 'event';
  const [copied, setCopied] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ticket.ticketCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSavePdf = () => window.print();

  const handleAddCalendar = () => {
    const start = ticket.startsAt ? new Date(ticket.startsAt) : new Date();
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + (isEvent ? 3 : 1) * 60 * 60 * 1000);
    const toIcsDate = (value: Date) => `${value.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;
    const slash = String.fromCharCode(92);
    const escapeIcs = (value: string) => value
      .split(slash).join(slash + slash)
      .split(String.fromCharCode(13)).join('')
      .split(String.fromCharCode(10)).join(`${slash}n`)
      .split(',').join(`${slash},`)
      .split(';').join(`${slash};`);
    const summary = isEvent ? ticket.eventTitle || 'Événement TicketHub' : `Trajet ${ticket.departCity} – ${ticket.arrivalCity}`;
    const location = isEvent ? `${ticket.venue || ''}${ticket.departCity ? `, ${ticket.departCity}` : ''}` : `${ticket.departStation}, ${ticket.departCity}`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TicketHub CI//Billet//FR', 'BEGIN:VEVENT',
      `UID:${escapeIcs(ticket.ticketCode)}@tickethub.ci`, `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`, `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeIcs(summary)}`, `LOCATION:${escapeIcs(location)}`,
      `DESCRIPTION:${escapeIcs(`Billet ${ticket.ticketCode} · ${ticket.departureDate} à ${ticket.departureTime}`)}`,
      'END:VEVENT', 'END:VCALENDAR', '',
    ].join(String.fromCharCode(13, 10));
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticket.ticketCode}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    setCalendarAdded(true);
    setTimeout(() => setCalendarAdded(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const description = isEvent
      ? `mon billet pour ${ticket.eventTitle} à ${ticket.venue}, le ${ticket.departureDate} à ${ticket.departureTime}`
      : `mon trajet ${ticket.departCity} → ${ticket.arrivalCity}, siège ${ticket.seats.join(', ')}, le ${ticket.departureDate} à ${ticket.departureTime}`;
    const text = encodeURIComponent(`TicketHub CI · ${description}. Code billet : ${ticket.ticketCode}.`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="print-pass flex flex-col w-full pb-16 max-w-md mx-auto">
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
              {isEvent ? 'Votre billet événementiel signé, prêt à être contrôlé.' : 'Votre titre de transport officiel est émis et sécurisé.'}
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
                  {isEvent ? 'Événement' : ticket.carrier}
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
                  {ticket.status === 'used' ? 'Déjà utilisé' : ticket.status === 'cancelled' ? 'Annulé' : 'Actif & Valide'}
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
                    {isEvent ? 'confirmation_number' : 'arrow_right_alt'}
                  </span>
                  <span className="font-headline text-[10px] text-[#5a4136] font-bold">
                    {ticket.duration}
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span className="font-headline text-[22px] font-bold tracking-tight text-right leading-tight">
                    {isEvent ? ticket.eventTitle || 'ÉVÉNEMENT' : ticket.arrivalCity}
                  </span>
                  <span className="font-body text-[11px] text-[#5a4136] flex items-center gap-1">
                    {isEvent ? ticket.eventCategory || ticket.category : ticket.arrivalStation}
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
                  {isEvent ? 'Date de l’événement' : 'Date de départ'}
                </span>
                <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
                  {ticket.departureDate}
                </span>
                <span className="font-body text-[11px] text-[#ff6b00] font-bold">
                  {isEvent ? `Ouverture / début ${ticket.departureTime}` : `Départ ${ticket.departureTime} (embarquement ${ticket.boardingTime})`}
                </span>
              </div>
            </div>

            {/* 3 Metric Badges */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase block">
                  {isEvent ? 'Catégorie' : 'Siège'}
                </span>
                <span className="font-headline text-[17px] font-bold text-[#ff6b00]">
                  {isEvent ? ticket.eventCategory || ticket.category : `N° ${ticket.seats.join(', ')}`}
                </span>
                <span className="font-body text-[10px] text-[#5a4136] block">{isEvent ? 'Accès par billet QR' : 'Place attribuée'}</span>
              </div>

              <div className="p-2 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase block">
                  {isEvent ? 'Événement' : 'Confort'}
                </span>
                <span className="font-headline text-[15px] font-bold text-[#0b1c30] mt-0.5 block">
                  {isEvent ? ticket.eventCategory || ticket.category : 'VIP'}
                </span>
                <span className="font-body text-[10px] text-[#216b43] font-bold block">
                  {isEvent ? 'Entrée valable' : 'Climatisé + Wifi'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase block">
                  Paiement
                </span>
                <span className="font-headline text-[15px] font-bold text-[#0b1c30] mt-0.5 block">
                  {ticket.price.toLocaleString('fr-FR')} F
                </span>
                <span className="font-body text-[10px] text-[#5a4136] block">{ticket.paymentMethod}</span>
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

              {/* Genuine QR image containing the server-signed, one-time ticket token */}
              <div className="relative p-3 rounded-2xl bg-white shadow-md flex items-center justify-center border border-[#dce9ff]">
                <QRCodeSVG
                  value={ticket.qrPayload}
                  size={192}
                  level="H"
                  includeMargin
                  title={`Billet ${ticket.ticketCode}`}
                  aria-label="QR code signé du billet"
                />
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
              Billet signé · vérifiable par le scanner partenaire
            </span>
            <span className="font-body text-[11px]">{ticket.issuedAt}</span>
          </div>
        </div>

        {/* 3. PWA & Sharing Actions */}
        <div className="flex flex-col gap-2 w-full">
          <button
            type="button"
            onClick={handleSavePdf}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer print:hidden"
          >
            <span className="material-symbols-outlined text-[20px]">print</span>
            <span>Imprimer / enregistrer en PDF</span>
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
              onClick={handleAddCalendar}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-[#e2bfb0]/40 text-[#0b1c30] font-headline text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#eff4ff] active:scale-95 transition-transform cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#ff6b00]">
                {calendarAdded ? 'event_available' : 'calendar_month'}
              </span>
              <span>{calendarAdded ? 'Fichier .ics téléchargé' : 'Télécharger calendrier'}</span>
            </button>
          </div>
        </div>

        {/* 4. Event entry or transport boarding information */}
        {isEvent ? (
          <div className="p-4 rounded-2xl bg-white border border-[#e2bfb0]/30 flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-[#ff6b00]">confirmation_number</span>
              <span className="font-headline text-[14px] font-bold text-[#0b1c30]">Accès à l’événement</span>
            </div>
            <p className="font-body text-[12px] text-[#0b1c30] leading-relaxed">
              Présentez ce QR code à l’entrée de <strong>{ticket.eventTitle}</strong>. Chaque billet est signé et ne peut être validé qu’une seule fois.
            </p>
            <p className="font-body text-[12px] text-[#5a4136]">{ticket.venue}{ticket.departCity ? ` · ${ticket.departCity}` : ''} · {ticket.departureDate} à {ticket.departureTime}</p>
            {ticket.venue && (
              <button
                type="button"
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ticket.venue}, ${ticket.departCity || ''}`)}`, '_blank', 'noopener,noreferrer')}
                className="self-start px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-headline text-[11px] font-bold flex items-center gap-1 border border-[#dce9ff] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-[#ff6b00]">navigation</span>
                Itinéraire du lieu
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white border border-[#e2bfb0]/30 flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#ff6b00]">directions_bus</span>
                <span className="font-headline text-[14px] font-bold text-[#0b1c30]">Instructions d’embarquement</span>
              </div>
              {ticket.quai && <span className="font-headline text-[10px] text-[#216b43] font-bold uppercase tracking-wider bg-[#a5f0be] px-2 py-0.5 rounded-full">{ticket.quai}</span>}
            </div>
            <div className="flex flex-col gap-1.5 font-body text-[12px] text-[#0b1c30]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[17px] text-[#5a4136] flex-shrink-0 mt-0.5">schedule</span>
                <span>Présentez-vous à <strong>{ticket.departStation || ticket.departCity}</strong> avant <strong className="text-[#ff6b00]">{ticket.boardingTime}</strong> avec une pièce d’identité originale.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[17px] text-[#5a4136] flex-shrink-0 mt-0.5">luggage</span>
                <span>Consultez les conditions de bagages auprès du transporteur avant le départ.</span>
              </div>
            </div>
            {ticket.departStation && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden shadow-xs mt-1 border border-[#dce9ff]">
                <img src={ASSETS.mapAdjame} alt={`Point de départ : ${ticket.departStation}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1c30]/85 via-transparent to-transparent flex items-end p-2.5 justify-between">
                  <div className="flex flex-col text-white"><span className="font-headline text-[12px] font-bold">{ticket.departStation}</span><span className="font-body text-[10px] opacity-90">{ticket.departCity}</span></div>
                  <button type="button" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ticket.departStation}, ${ticket.departCity}`)}`, '_blank', 'noopener,noreferrer')} className="px-2.5 py-1 rounded-lg bg-white text-[#0b1c30] font-headline text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer">
                    <span className="material-symbols-outlined text-[14px] text-[#ff6b00]">navigation</span>Itinéraire
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
