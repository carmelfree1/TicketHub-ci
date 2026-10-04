import React, { useEffect, useState } from 'react';
import { formatXof } from '@tickethub/shared';
import { type AuthUser, type DigitalTicket } from '@/types';
import { ApiError, type TicketRecord } from '@/services/api';
import { ticketsApi } from '@/features/tickets/api';
import { toDigitalTicket } from '@/services/ticketMapper';

interface TicketsWalletScreenProps {
  user: AuthUser | null;
  onViewPass: (ticket: DigitalTicket) => void;
  onExplore: () => void;
  onLogin: () => void;
}

function formatDate(value?: string): string {
  if (!value) return 'Date à confirmer';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date à confirmer' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

export const TicketsWalletScreen: React.FC<TicketsWalletScreenProps> = ({ user, onViewPass, onExplore, onLogin }) => {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresLogin, setRequiresLogin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setTickets([]);
      setRequiresLogin(true);
      setError('Connectez-vous pour consulter les billets rattachés à votre compte.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    ticketsApi.list()
      .then((result) => {
        if (active) {
          setTickets(result);
          setRequiresLogin(false);
          setError('');
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401) {
          setRequiresLogin(true);
          setError('Connectez-vous pour consulter les billets rattachés à votre compte.');
        } else {
          setError(reason instanceof Error ? reason.message : 'Impossible de charger vos billets.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  const activeCount = tickets.filter((ticket) => ticket.status === 'active').length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col pb-24 px-4 sm:px-6 lg:px-8 pt-3 gap-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-headline text-[20px] font-bold text-[#0b1c30]">Mes billets</h1>
          <p className="font-body text-[12px] text-[#5a4136]">Billets émis après confirmation du paiement</p>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-[#ffdbcc] text-[#a04100] font-headline text-[11px] font-bold border border-[#ffb693]">
          {activeCount} actif{activeCount === 1 ? '' : 's'}
        </span>
      </div>

      {loading && (
        <div role="status" className="p-5 rounded-2xl bg-white border border-[#dce9ff] text-center font-body text-[13px] text-[#5a4136]">
          Chargement de votre portefeuille…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="p-4 rounded-2xl bg-[#ffdad6] border border-[#93000a]/10 text-[#93000a] flex flex-col gap-3">
          <p className="font-body text-[12px]">{error}</p>
          {requiresLogin && <button type="button" onClick={onLogin} className="self-start px-4 py-2 rounded-xl bg-[#93000a] text-white font-headline text-[12px] font-bold cursor-pointer">Se connecter</button>}
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#dce9ff] text-center flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-[32px] text-[#c2410c]" aria-hidden="true">confirmation_number</span>
          <h2 className="font-headline text-[15px] font-bold text-[#0b1c30]">Aucun billet pour le moment</h2>
          <p className="font-body text-[12px] text-[#5a4136]">Vos billets apparaîtront ici après confirmation du paiement par le serveur.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tickets.map((record) => {
          const ticket = toDigitalTicket(record);
          const isEvent = record.productType === 'event';
          const isActive = record.status === 'active';
          return (
            <article key={record.id} className="bg-white rounded-3xl p-4 shadow-sm border border-[#e2bfb0]/40 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex flex-col gap-1">
                  <span className="self-start px-2.5 py-0.5 rounded-md bg-[#ffdbcc] text-[#a04100] font-headline text-[10px] font-bold border border-[#ffb693]">
                    {isEvent ? 'Événement' : record.carrier || 'Transport'}
                  </span>
                  <h2 className="font-headline text-[15px] font-bold text-[#0b1c30] truncate">
                    {isEvent ? record.eventTitle || 'Billet événementiel' : `${record.departCity || ''} → ${record.arrivalCity || ''}`}
                  </h2>
                  <p className="font-body text-[11px] text-[#5a4136] truncate">
                    {isEvent ? `${record.venue || ''}${record.city ? ` · ${record.city}` : ''}` : `${record.departStation || ''} · ${record.arrivalStation || ''}`}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-md font-headline text-[10px] font-bold uppercase tracking-wider ${isActive ? 'bg-[#a5f0be] text-[#00522e]' : 'bg-[#eff4ff] text-[#5a4136]'}`}>
                  {record.status === 'active' ? 'Valide' : record.status === 'used' ? 'Utilisé' : 'Annulé'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#eff4ff] p-2.5 rounded-xl border border-[#dce9ff] text-center">
                <div className="min-w-0">
                  <span className="font-headline text-[9px] uppercase font-bold text-[#5a4136] block">{isEvent ? 'Catégorie' : 'Siège'}</span>
                  <span className="font-headline text-[12px] font-bold text-[#c2410c] truncate block">
                    {isEvent ? record.category || 'Entrée' : record.seats?.join(', ') || 'Non précisé'}
                  </span>
                </div>
                <div>
                  <span className="font-headline text-[9px] uppercase font-bold text-[#5a4136] block">{isEvent ? 'Événement' : 'Départ'}</span>
                  <span className="font-headline text-[12px] font-bold text-[#0b1c30]">{record.departureTime || 'Non précisé'}</span>
                </div>
                <div>
                  <span className="font-headline text-[9px] uppercase font-bold text-[#5a4136] block">Date · Prix</span>
                  <span className="font-headline text-[11px] font-bold text-[#216b43] block">{formatDate(record.departureDate)}</span>
                  <span className="font-body text-[10px] text-[#0b1c30]">{formatXof(Number(record.price))} F</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-[10px] text-[#5a4136] truncate">Billet {record.ticketCode}</span>
                <button type="button" onClick={() => onViewPass(ticket)} className="shrink-0 px-3 py-2 rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-headline text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">qr_code_2</span>Afficher le QR
                </button>
              </div>
            </article>
          );
        })}
        </div>
      </div>

      <div className="mt-4 p-4 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] text-center flex flex-col items-center gap-2">
        <span className="material-symbols-outlined text-[#c2410c] text-[28px]" aria-hidden="true">explore</span>
        <h2 className="font-headline text-[14px] font-bold text-[#0b1c30]">Prêt pour un nouveau départ ?</h2>
        <p className="font-body text-[12px] text-[#5a4136] max-w-xs">Recherchez un trajet ou un événement et retrouvez vos billets ici après paiement confirmé.</p>
        <button type="button" onClick={onExplore} className="mt-1 px-4 py-2 bg-[#c2410c] text-white rounded-xl font-headline text-[13px] font-bold active:scale-95 transition-transform cursor-pointer">Explorer</button>
      </div>
    </div>
  );
};
