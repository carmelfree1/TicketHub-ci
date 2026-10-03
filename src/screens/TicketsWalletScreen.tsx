import React from 'react';
import { DigitalTicket } from '../types';
import { ASSETS } from '../data/mockData';

interface TicketsWalletScreenProps {
  currentTicket: DigitalTicket;
  onViewPass: (ticket: DigitalTicket) => void;
  onExplore: () => void;
}

export const TicketsWalletScreen: React.FC<TicketsWalletScreenProps> = ({
  currentTicket,
  onViewPass,
  onExplore,
}) => {
  return (
    <div className="flex flex-col w-full pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-headline text-[20px] font-bold text-[#0b1c30]">
            Mes Billets &amp; Pass
          </h2>
          <p className="font-body text-[12px] text-[#5a4136]">
            Vos titres officiels certifiés hors-ligne
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#ffdbcc] text-[#a04100] font-headline text-[11px] font-bold border border-[#ffb693]">
          2 Actifs
        </span>
      </div>

      {/* Ticket 1: Current active intercity bus pass */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#e2bfb0]/40 flex flex-col gap-3 mb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffdbcc] text-[#a04100] font-headline text-[11px] font-bold border border-[#ffb693]">
              {currentTicket.carrier}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#0b1c30] font-headline text-[10px] font-bold">
              Bus VIP
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#216b43] animate-pulse"></span>
            Valide
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="font-headline text-[18px] font-bold text-[#0b1c30] leading-none block">
              {currentTicket.departCity}
            </span>
            <span className="font-body text-[11px] text-[#5a4136]">
              {currentTicket.departStation}
            </span>
          </div>

          <div className="flex flex-col items-center px-2">
            <span className="material-symbols-outlined text-[#ff6b00] text-[20px]">
              trending_flat
            </span>
            <span className="font-headline text-[10px] text-[#5a4136]">Direct</span>
          </div>

          <div className="text-right">
            <span className="font-headline text-[18px] font-bold text-[#0b1c30] leading-none block">
              {currentTicket.arrivalCity}
            </span>
            <span className="font-body text-[11px] text-[#5a4136]">
              {currentTicket.arrivalStation}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-[#eff4ff] p-2.5 rounded-xl border border-[#dce9ff] text-center">
          <div>
            <span className="font-headline text-[9px] uppercase font-bold text-[#5a4136] block">
              Siège
            </span>
            <span className="font-headline text-[14px] font-bold text-[#ff6b00]">
              N° {currentTicket.seats.join(', ')}
            </span>
          </div>
          <div>
            <span className="font-headline text-[9px] uppercase font-bold text-[#5a4136] block">
              Départ
            </span>
            <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
              {currentTicket.departureTime}
            </span>
          </div>
          <div>
            <span className="font-headline text-[9px] uppercase font-bold text-[#5a4136] block">
              Prix
            </span>
            <span className="font-headline text-[14px] font-bold text-[#216b43]">
              {currentTicket.price.toLocaleString('fr-FR')} F
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewPass(currentTicket)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[13px] font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
          <span>Afficher le Pass Digital (QR &amp; Embarquement)</span>
        </button>
      </div>

      {/* Ticket 2: Concert Pass */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#e2bfb0]/40 flex flex-col gap-3 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffdbcc] text-[#a04100] font-headline text-[11px] font-bold border border-[#ffb693]">
              Concert Live
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#0b1c30] font-headline text-[10px] font-bold">
              Pass VIP
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#216b43]"></span>
            Confirmé
          </span>
        </div>

        <div className="flex items-center gap-3">
          <img
            src={ASSETS.didiBConcert}
            alt="Didi B"
            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col min-w-0">
            <h3 className="font-headline text-[15px] font-bold text-[#0b1c30] truncate">
              Concert Live Didi B • Sacré Tour
            </h3>
            <span className="font-body text-[11px] text-[#5a4136]">
              Samedi 26 Octobre • 20h00
            </span>
            <span className="font-body text-[11px] text-[#ff6b00] font-bold">
              Palais de la Culture, Treichville
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[#eff4ff]">
          <span className="font-body text-[11px] text-[#5a4136]">
            Pass N° TKH-DIDI-9214
          </span>
          <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
            10 000 FCFA
          </span>
        </div>
      </div>

      {/* Discovery CTA */}
      <div className="p-4 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] text-center flex flex-col items-center gap-2">
        <span className="material-symbols-outlined text-[#ff6b00] text-[28px]">
          airplane_ticket
        </span>
        <h4 className="font-headline text-[14px] font-bold text-[#0b1c30]">
          Envie d'un nouveau voyage ?
        </h4>
        <p className="font-body text-[12px] text-[#5a4136] max-w-xs">
          Comparez en direct plus de 28 compagnies interurbaines à Abidjan, Bouaké et Yamoussoukro.
        </p>
        <button
          type="button"
          onClick={onExplore}
          className="mt-1 px-4 py-2 bg-[#ff6b00] text-white rounded-xl font-headline text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
        >
          Rechercher un départ
        </button>
      </div>
    </div>
  );
};
