import React, { useState } from 'react';
import { formatXof } from '@tickethub/shared';
import { type TicketCategory, type TicketedEvent } from '@/types';

interface EventTicketSelectionScreenProps {
  event: TicketedEvent;
  onContinue: (category: TicketCategory, quantity: number) => void;
  onBack: () => void;
  isBooking?: boolean;
  actionError?: string;
}

export const EventTicketSelectionScreen: React.FC<EventTicketSelectionScreenProps> = ({ event, onContinue, onBack, isBooking = false, actionError = '' }) => {
  const [categoryId, setCategoryId] = useState(event.categories[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const selected = event.categories.find((category) => category.id === categoryId) ?? event.categories[0];
  const start = new Date(event.startsAt);
  const total = selected ? selected.price * quantity : 0;

  return (
    <div className="flex flex-col w-full pb-32 max-w-md mx-auto px-4 pt-2">
      <button type="button" onClick={onBack} className="self-start mb-2 px-2 py-1 font-headline text-[12px] font-bold text-[#5a4136] flex items-center gap-1 cursor-pointer">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span> Retour aux événements
      </button>
      <section className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e2bfb0]/30 mb-3">
        <img src={event.imageUrl} alt="" className="w-full h-40 object-cover" referrerPolicy="no-referrer" />
        <div className="p-4 flex flex-col gap-2">
          <span className="self-start px-2.5 py-1 rounded-full bg-[#ffdbcc] text-[#a04100] font-headline text-[10px] font-bold uppercase">{event.eventType === 'sport' ? 'Sport' : event.eventType === 'show' ? 'Spectacle' : 'Concert'}</span>
          <h2 className="font-headline text-[20px] font-bold text-[#0b1c30] leading-tight">{event.title}</h2>
          <p className="font-body text-[12px] text-[#5a4136]">{event.description}</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="rounded-xl bg-[#eff4ff] p-2.5 border border-[#dce9ff]">
              <span className="block font-headline text-[9px] uppercase font-bold text-[#5a4136]">Date &amp; heure</span>
              <span className="font-headline text-[12px] font-bold text-[#0b1c30]">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(start)}</span>
            </div>
            <div className="rounded-xl bg-[#eff4ff] p-2.5 border border-[#dce9ff]">
              <span className="block font-headline text-[9px] uppercase font-bold text-[#5a4136]">Lieu</span>
              <span className="font-headline text-[12px] font-bold text-[#0b1c30]">{event.venue}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">Choisissez votre catégorie</h3>
        {event.categories.map((category) => {
          const isSelected = category.id === selected?.id;
          const soldOut = category.available <= 0;
          return (
            <button
              type="button"
              key={category.id}
              disabled={soldOut}
              onClick={() => { setCategoryId(category.id); setQuantity((current) => Math.min(current, Math.max(1, category.available))); }}
              className={`w-full p-3 rounded-2xl text-left border flex items-center justify-between gap-2 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isSelected ? 'bg-[#ffdbcc]/40 border-[#ff6b00] ring-1 ring-[#ff6b00]/30' : 'bg-white border-[#e2bfb0]/30'}`}
            >
              <span className="flex flex-col">
                <span className="font-headline text-[14px] font-bold text-[#0b1c30]">{category.name}</span>
                <span className="font-body text-[11px] text-[#5a4136]">{soldOut ? 'Épuisé' : `${category.available} places disponibles`}</span>
              </span>
              <span className="font-headline text-[15px] font-bold text-[#ff6b00]">{formatXof(category.price)} FCFA</span>
            </button>
          );
        })}
      </section>

      {selected && (
        <section className="mt-3 p-3 rounded-2xl bg-white border border-[#e2bfb0]/30 flex items-center justify-between">
          <div>
            <label htmlFor="event-quantity" className="block font-headline text-[11px] font-bold text-[#0b1c30]">Nombre de billets</label>
            <select id="event-quantity" value={quantity} onChange={(eventChange) => setQuantity(Number(eventChange.target.value))} className="mt-1 h-9 px-2 rounded-lg bg-[#eff4ff] border border-[#dce9ff] font-headline text-[13px] text-[#0b1c30]">
              {Array.from({ length: Math.min(10, selected.available) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </div>
          <div className="text-right">
            <span className="block font-headline text-[10px] uppercase font-bold text-[#5a4136]">Total</span>
            <span className="font-headline text-[18px] font-bold text-[#ff6b00]">{formatXof(total)} FCFA</span>
          </div>
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#dce9ff] p-4 shadow-[0_-8px_30px_rgba(11,28,48,0.12)]">
        <div className="max-w-md mx-auto flex flex-col gap-2">
          {actionError && <p role="alert" className="p-2 rounded-xl bg-[#ffdad6] text-[#93000a] font-body text-[11px]">{actionError}</p>}
          <button type="button" onClick={() => { if (selected) onContinue(selected, quantity); }} disabled={isBooking || !selected || selected.available < quantity} className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[14px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            <span className="material-symbols-outlined text-[20px]">{isBooking ? 'progress_activity' : 'lock'}</span>
            {isBooking ? 'Réservation en cours…' : 'Continuer vers le paiement'}
          </button>
        </div>
      </div>
    </div>
  );
};
