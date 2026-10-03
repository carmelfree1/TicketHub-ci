import React, { useState } from 'react';
import { MOCK_MANIFEST } from '../../data/mockData';
import { ManifestPassenger } from '../../types';

export const PartnerManifestScreen: React.FC = () => {
  const [passengers, setPassengers] = useState<ManifestPassenger[]>(MOCK_MANIFEST);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'boarded' | 'pending'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleValidateManually = (seatNum: number) => {
    setPassengers((prev) =>
      prev.map((p) =>
        p.seatNumber === seatNum
          ? {
              ...p,
              status: 'boarded',
              scanTime: 'À l\'instant',
              scanLocation: 'Guichet Chef de Gare',
            }
          : p
      )
    );
    showToast(`Passager Siège ${seatNum} validé à bord manuellement !`);
  };

  const handleCloture = () => {
    showToast('Feuille de route officielle générée et transmise au régulateur UTB');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      'UTB Express Car #12 - Manifeste de bord Abidjan -> Yamoussoukro 08:30 : 41 passagers confirmés. Départ prêt.'
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const filteredPassengers = passengers.filter((p) => {
    const query = searchTerm.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      p.ticketCode.toLowerCase().includes(query) ||
      String(p.seatNumber).includes(query);

    const matchFilter =
      filter === 'all' ||
      (filter === 'boarded' && p.status === 'boarded') ||
      (filter === 'pending' && p.status === 'pending');

    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col w-full pb-24 max-w-md mx-auto px-4 pt-2">
      {/* 1. Trip Header Overview Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#e2bfb0]/30 flex flex-col gap-2 mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eff4ff] text-[#0b1c30] font-headline text-[10px] font-bold border border-[#dce9ff]">
                <span className="material-symbols-outlined text-[13px] text-[#ff6b00]">
                  directions_bus
                </span>
                Car VIP #12
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#216b43] animate-pulse"></span>
                Complet 41/41
              </span>
            </div>
            <h2 className="font-headline text-[18px] font-bold text-[#0b1c30] mt-1 truncate">
              Abidjan → Yamoussoukro
            </h2>
            <p className="font-body text-[11px] text-[#5a4136] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Aujourd'hui • Départ 08:30 (Quai 3 Adjamé)
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] flex flex-col items-center justify-center flex-shrink-0 text-[#ff6b00] border border-[#dce9ff]">
            <span className="font-headline text-[9px] font-bold text-[#5a4136]">TAUX</span>
            <span className="font-headline text-[17px] font-bold leading-none">93%</span>
          </div>
        </div>

        <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden flex mt-0.5 border border-[#dce9ff]">
          <div className="bg-[#216b43] h-full rounded-full" style={{ width: '92.6%' }}></div>
        </div>

        <div className="flex justify-between items-center text-[#5a4136] font-body text-[11px]">
          <span>38 embarqués</span>
          <span>3 en attente</span>
        </div>
      </div>

      {/* 2. Finances du Voyage Card */}
      <div className="bg-[#eff4ff] rounded-3xl p-3.5 shadow-xs border border-[#dce9ff] flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#ff6b00] text-[18px]">
              account_balance_wallet
            </span>
            <span className="font-headline text-[13px] font-bold text-[#0b1c30]">
              Finances du Voyage
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[9px] font-bold">
            <span className="material-symbols-outlined text-[11px]">verified_user</span>
            Garanti GeniusPay Escrow
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-0.5">
          <div className="bg-white p-2.5 rounded-xl border border-[#dce9ff] flex flex-col">
            <span className="font-headline text-[9px] text-[#5a4136] uppercase font-bold">
              Total Brut (41 pax)
            </span>
            <span className="font-headline text-[16px] font-bold text-[#0b1c30]">
              205 000 <span className="text-[11px] font-normal">FCFA</span>
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-[#dce9ff] flex flex-col">
            <span className="font-headline text-[9px] text-[#ba1a1a] uppercase font-bold">
              Com. TicketHub (5%)
            </span>
            <span className="font-headline text-[16px] font-bold text-[#ba1a1a]">
              -10 250 <span className="text-[11px] font-normal">FCFA</span>
            </span>
          </div>
        </div>

        <div className="bg-[#216b43] text-white p-3 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="font-headline text-[10px] text-[#a8f3c1] uppercase font-bold">
              Net à reverser UTB
            </span>
            <span className="font-headline text-[18px] font-bold">194 750 FCFA</span>
          </div>
          <span className="material-symbols-outlined text-[24px]">payments</span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-3 text-[#5a4136] text-[18px]">
            search
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher nom, téléphone (+225), n° billet..."
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-white text-[#0b1c30] placeholder:text-[#5a4136]/70 font-body text-[12px] shadow-xs border border-[#e2bfb0]/30 outline-none focus:ring-1 focus:ring-[#ff6b00]"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full font-headline text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all ${
              filter === 'all'
                ? 'bg-[#ff6b00] text-white'
                : 'bg-white text-[#0b1c30] border border-[#dce9ff]'
            }`}
          >
            <span>Tous</span>
            <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[9px]">
              {passengers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('boarded')}
            className={`px-3 py-1 rounded-full font-headline text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all ${
              filter === 'boarded'
                ? 'bg-[#216b43] text-white'
                : 'bg-white text-[#0b1c30] border border-[#dce9ff]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#216b43]"></span>
            <span>Embarqués</span>
            <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[9px]">
              {passengers.filter((p) => p.status === 'boarded').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-full font-headline text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all ${
              filter === 'pending'
                ? 'bg-[#ff6b00] text-white'
                : 'bg-white text-[#0b1c30] border border-[#dce9ff]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00]"></span>
            <span>Non présentés</span>
            <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[9px]">
              {passengers.filter((p) => p.status === 'pending').length}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Passenger List */}
      <div className="flex flex-col gap-2.5 mb-4">
        {filteredPassengers.map((passenger) => {
          const isBoarded = passenger.status === 'boarded';

          return (
            <div
              key={passenger.seatNumber}
              className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#e2bfb0]/30 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-xs border ${
                      isBoarded
                        ? 'bg-[#eff4ff] text-[#ff6b00] border-[#dce9ff]'
                        : 'bg-[#ffdbcc] text-[#a04100] border-[#ffb693]'
                    }`}
                  >
                    <span className="font-headline text-[8px] uppercase tracking-wider text-[#5a4136] font-bold">
                      Siège
                    </span>
                    <span className="font-headline text-[15px] font-bold leading-none">
                      {String(passenger.seatNumber).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-headline text-[14px] font-bold text-[#0b1c30] truncate">
                        {passenger.name}
                      </span>
                      {isBoarded && (
                        <span className="material-symbols-outlined text-[15px] text-[#216b43] fill">
                          check_circle
                        </span>
                      )}
                    </div>
                    <a
                      href={`tel:${passenger.phone}`}
                      className="font-body text-[11px] text-[#ff6b00] flex items-center gap-0.5 hover:underline"
                    >
                      <span className="material-symbols-outlined text-[13px]">call</span>
                      {passenger.phone}
                    </a>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-headline text-[10px] font-bold uppercase ${
                    isBoarded
                      ? 'bg-[#a5f0be] text-[#00522e]'
                      : 'bg-[#ffdbcc] text-[#a04100] border border-[#ffb693]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBoarded ? 'bg-[#216b43]' : 'bg-[#ff6b00] animate-pulse'
                    }`}
                  ></span>
                  {isBoarded ? 'À BORD (USED)' : 'ATTENTE QUAI'}
                </span>
              </div>

              {/* Ticket Ref & Price */}
              <div className="flex items-center justify-between text-[#5a4136] font-body text-[11px] bg-[#eff4ff] px-2.5 py-1.5 rounded-xl border border-[#dce9ff]">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">confirmation_number</span>
                  <span className="font-headline text-[10px] font-bold text-[#0b1c30]">
                    {passenger.ticketCode}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.2 rounded bg-white text-[#0b1c30] font-headline text-[9px] font-bold border border-[#dce9ff]">
                    {passenger.operator}
                  </span>
                  <span className="font-bold text-[#0b1c30]">
                    {passenger.price.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Status details & actions */}
              {isBoarded ? (
                <div className="flex items-center justify-between text-[#5a4136] font-body text-[10px] px-1">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-[#216b43]">
                      qr_code_scanner
                    </span>
                    Scanné à {passenger.scanTime} ({passenger.scanLocation})
                  </span>
                  <span>
                    {passenger.luggageCount > 0
                      ? `Soute (${passenger.luggageCount} bagages)`
                      : 'Sans bagage soute'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={`tel:${passenger.phone}`}
                    className="flex-1 h-9 bg-[#eff4ff] text-[#0b1c30] rounded-xl font-headline text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform border border-[#dce9ff]"
                  >
                    <span className="material-symbols-outlined text-[15px] text-[#ff6b00]">
                      phone_in_talk
                    </span>
                    <span>Appeler</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleValidateManually(passenger.seatNumber)}
                    className="flex-1 h-9 bg-[#216b43] text-white rounded-xl font-headline text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-transform cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">how_to_reg</span>
                    <span>Valider Manuellement</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Regulation Departure Actions */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#e2bfb0]/30 flex flex-col gap-2.5">
        <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
          Actions de Régulation Départ
        </span>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleCloture}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[13px] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Clôturer le Départ &amp; Imprimer Feuille de Route</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full h-11 rounded-xl bg-[#a5f0be] text-[#00522e] font-headline text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-transform font-bold cursor-pointer border border-[#216b43]/20"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>Exporter WhatsApp pour le Chauffeur</span>
          </button>
        </div>

        <p className="font-body text-[11px] text-[#5a4136] text-center mt-0.5">
          Départ officiel programmé à 08:30 • UTB Gare Principale Adjamé
        </p>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#0b1c30] text-white p-3 rounded-2xl shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[18px] text-[#a5f0be]">
            check_circle
          </span>
          <span className="font-body text-[12px]">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
