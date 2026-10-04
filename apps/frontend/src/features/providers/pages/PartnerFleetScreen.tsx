import React, { useState } from 'react';
import { type AppScreen } from '@/types';

interface PartnerFleetScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

export const PartnerFleetScreen: React.FC<PartnerFleetScreenProps> = ({
  onNavigate,
}) => {
  const [inspectedSeat, setInspectedSeat] = useState({
    number: '14',
    name: 'Awa Kouassi',
    status: 'Validé à bord • Bagages: 2 sacs soute enregistrés',
    price: '5 000 FCFA',
    method: 'Wave',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSeatClick = (
    num: string,
    name: string,
    status: string,
    price: string,
    method: string
  ) => {
    setInspectedSeat({ number: num, name, status, price, method });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col pb-24 px-4 sm:px-6 lg:px-8 pt-3">
      {/* Action Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="font-headline text-[20px] font-bold text-[#0b1c30]">
            Départs &amp; Flotte
          </h2>
          <p className="font-body text-[11px] text-[#5a4136]">
            UTB Gare Centrale Adjamé • Direct Gares
          </p>
        </div>
        <button
          type="button"
          onClick={() => showToast('Assistant programmation de car ouvert')}
          className="h-10 px-3 bg-[#ff6b00] text-white rounded-xl font-headline text-[12px] font-bold shadow-sm flex items-center gap-1 active:scale-95 transition-transform flex-shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Programmer</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-3 text-[20px] text-[#5a4136]">
            search
          </span>
          <input
            type="text"
            placeholder="Rechercher ligne, car (ex: 4829 JJ 01)..."
            className="w-full h-11 pl-10 pr-16 bg-white rounded-xl font-body text-[13px] text-[#0b1c30] placeholder:text-[#5a4136]/70 shadow-xs border border-[#e2bfb0]/30 focus:outline-none focus:ring-1 focus:ring-[#ff6b00]"
          />
          <button
            type="button"
            className="absolute right-2 top-2 h-7 px-2 bg-[#eff4ff] text-[#0b1c30] rounded-lg font-headline text-[10px] font-bold flex items-center gap-0.5 border border-[#dce9ff]"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Filtre
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            className="px-3 py-1 rounded-full bg-[#0b1c30] text-white font-headline text-[11px] font-bold shadow-xs whitespace-nowrap"
          >
            Tous (9)
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[11px] font-bold flex items-center gap-1 shadow-xs whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#216b43] animate-pulse"></span>
            En embarquement (2)
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-full bg-[#dce9ff] text-[#0b1c30] font-headline text-[11px] font-bold whitespace-nowrap"
          >
            À venir (5)
          </button>
        </div>
      </div>

      {/* Realtime Sync & Lock Banner */}
      <div className="flex items-center justify-between p-2.5 bg-[#eff4ff] rounded-2xl border border-[#dce9ff] mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[#216b43] flex-shrink-0">
            lock_reset
          </span>
          <p className="font-body text-[11px] text-[#0b1c30] truncate">
            <strong className="text-[#216b43] font-bold">Verrouillage atomique actif</strong> • 0 conflit de siège
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[9px] font-bold uppercase">
          LIVE
        </span>
      </div>

      {/* Primary Departure Card (In Boarding) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2bfb0]/30 space-y-3 relative overflow-hidden mb-3">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ff6b00] via-[#216b43] to-[#ff6b00]"></div>

        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ffdad6] text-[#93000a] font-headline text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-ping"></span>
              DÉPART DANS 18 MIN
            </div>
            <h3 className="font-headline text-[16px] font-bold text-[#0b1c30] flex items-center gap-1">
              Abidjan <span className="material-symbols-outlined text-[18px] text-[#ff6b00]">arrow_forward</span> Yamoussoukro
            </h3>
            <p className="font-body text-[11px] text-[#5a4136] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">location_on</span>
              Gare Adjamé • Quai N°3
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="font-headline text-[20px] text-[#ff6b00] font-bold">08:30</span>
            <p className="font-body text-[10px] text-[#5a4136]">Aujourd'hui, 24 Oct</p>
          </div>
        </div>

        {/* Coach Pill Info */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#eff4ff] rounded-xl border border-[#dce9ff]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#ff6b00] shadow-xs">
              <span className="material-symbols-outlined text-[18px]">directions_bus</span>
            </div>
            <div className="min-w-0">
              <p className="font-headline text-[9px] text-[#5a4136] uppercase font-bold">Véhicule</p>
              <p className="font-headline text-[13px] font-bold text-[#0b1c30] truncate">Marcopolo VIP</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#216b43] shadow-xs">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </div>
            <div className="min-w-0">
              <p className="font-headline text-[9px] text-[#5a4136] uppercase font-bold">Immatriculation</p>
              <p className="font-headline text-[13px] font-bold text-[#0b1c30] truncate">4829 JJ 01</p>
            </div>
          </div>
        </div>

        {/* Fill Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between font-headline text-[11px]">
            <span className="text-[#0b1c30] flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[16px] text-[#216b43]">
                airline_seat_recline_normal
              </span>
              Taux d'occupation : <strong className="text-[#216b43]">100% COMPLET</strong>
            </span>
            <span className="text-[#ff6b00] font-bold">41 / 41 vendus</span>
          </div>

          <div className="w-full h-2.5 bg-[#eff4ff] rounded-full overflow-hidden p-0.5 border border-[#dce9ff]">
            <div className="h-full bg-[#216b43] rounded-full w-full"></div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="font-body text-[11px] text-[#5a4136]">
              Recette totale guichet &amp; mobile
            </span>
            <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
              205 000 FCFA
            </span>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#eff4ff]">
          <button
            type="button"
            onClick={() => onNavigate('partner-manifest')}
            className="h-10 px-2 rounded-xl bg-[#eff4ff] text-[#0b1c30] font-headline text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform border border-[#dce9ff] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Feuille de route</span>
          </button>

          <button
            type="button"
            onClick={() => showToast('Appel d\'embarquement clôturé avec succès')}
            className="h-10 px-2 rounded-xl bg-[#dce9ff] text-[#0b1c30] font-headline text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Clôturer l'appel</span>
          </button>
        </div>
      </div>

      {/* Interactive Seat Deck & Occupancy Inspector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e2bfb0]/30 space-y-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline text-[15px] font-bold text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#ff6b00]">
                event_seat
              </span>
              Disposition Car &amp; Sièges
            </h3>
            <p className="font-body text-[11px] text-[#5a4136]">
              Schéma 2+2 • 41 Fauteuils Grand Confort
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-1.5 font-headline text-[10px] font-bold">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#a5f0be] text-[#00522e] rounded-md">
            <span className="w-2 h-2 rounded-full bg-[#216b43]"></span>
            <span>Validé (34)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#eff4ff] text-[#0b1c30] rounded-md border border-[#dce9ff]">
            <span className="w-2 h-2 rounded-full bg-[#ff6b00]"></span>
            <span>En attente (7)</span>
          </div>
        </div>

        {/* Mini Cabin Grid */}
        <div className="bg-[#eff4ff] rounded-2xl p-3 border border-[#dce9ff]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-dashed border-[#dce9ff]">
            <span className="font-headline text-[10px] uppercase font-bold text-[#5a4136]">
              Poste Conducteur (M. Traoré)
            </span>
            <span className="flex items-center gap-1 text-[#216b43] font-headline text-[10px] font-bold bg-[#a5f0be] px-2 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-[14px]">sensors</span>
              GPS Online
            </span>
          </div>

          <div className="space-y-2">
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('01', 'Bakary Diomandé', 'Validé à bord', '5 000 FCFA', 'Orange Money')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  01
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('02', 'Fatou Cissé', 'Validé à bord', '5 000 FCFA', 'Wave')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  02
                </button>
              </div>

              <div className="w-6 text-center text-[#5a4136] font-headline text-[9px] font-bold">
                •••
              </div>

              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('03', 'Jean Kouassi', 'Validé à bord', '5 000 FCFA', 'Guichet')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  03
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('04', 'Bakary Koné', 'Validé à bord', '5 000 FCFA', 'MTN')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  04
                </button>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('05', 'Mariam Touré', 'Validé à bord', '5 000 FCFA', 'Moov')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  05
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('06', 'Christian Yao', 'En attente quai', '5 000 FCFA', 'Wave')
                  }
                  className="flex-1 h-10 bg-white border border-[#dce9ff] text-[#0b1c30] rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  06
                </button>
              </div>

              <div className="w-6 text-center text-[#5a4136] font-headline text-[9px] font-bold">
                •••
              </div>

              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('07', 'Marie-Ange Yao', 'En attente Quai 3 (Non scanné)', '5 000 FCFA', 'MTN MoMo')
                  }
                  className="flex-1 h-10 bg-[#ffdbcc] text-[#a04100] border border-[#ffb693] rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer animate-pulse"
                >
                  07
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('08', 'Seydou Dagnogo', 'Validé à bord', '5 000 FCFA', 'Orange')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  08
                </button>
              </div>
            </div>

            {/* Row 4 (Focus on Seat 14) */}
            <div className="flex items-center justify-between gap-2 bg-white p-1 rounded-xl shadow-xs border border-[#e2bfb0]/30">
              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('13', 'Brice Gnahoré', 'Validé à bord', '5 000 FCFA', 'Wave')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  13
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('14', 'Awa Kouassi', 'Validé à bord • Bagages: 2 sacs soute enregistrés', '5 000 FCFA', 'Wave')
                  }
                  className="flex-1 h-10 bg-[#ff6b00] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs ring-2 ring-[#ff6b00]/40 cursor-pointer"
                >
                  14
                </button>
              </div>

              <div className="w-10 text-center text-[#ff6b00] font-headline text-[9px] font-bold tracking-wider">
                ALLÉE
              </div>

              <div className="flex items-center gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('15', 'Koffi Brou', 'En attente Quai 3 (Tél: +225 07 48 92 10)', '5 000 FCFA', 'Wave')
                  }
                  className="flex-1 h-10 bg-[#ffdbcc] text-[#a04100] border border-[#ffb693] rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  15
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSeatClick('16', 'Seydou Bamba', 'Validé à bord', '5 000 FCFA', 'Guichet')
                  }
                  className="flex-1 h-10 bg-[#216b43] text-white rounded-lg flex flex-col items-center justify-center font-headline text-[11px] font-bold active:scale-95 shadow-xs cursor-pointer"
                >
                  16
                </button>
              </div>
            </div>
          </div>

          {/* Seat Inspector Floating Box */}
          <div className="mt-3 p-3 bg-white rounded-xl shadow-xs border border-[#e2bfb0]/30 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-[#ff6b00] text-white rounded font-headline text-[10px] font-bold">
                  Siège {inspectedSeat.number}
                </span>
                <span className="font-headline text-[13px] font-bold text-[#0b1c30] truncate">
                  {inspectedSeat.name}
                </span>
              </div>
              <p className="font-body text-[11px] text-[#5a4136] truncate mt-0.5">
                {inspectedSeat.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => showToast(`Siège ${inspectedSeat.number} inspecté et synchronisé`)}
              className="px-2.5 py-1.5 bg-[#eff4ff] text-[#0b1c30] rounded-lg font-headline text-[11px] font-bold shadow-xs flex items-center gap-1 border border-[#dce9ff] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">build</span>
              Action
            </button>
          </div>
        </div>
      </div>

      {/* Operational Actions Grid */}
      <div className="bg-[#eff4ff] rounded-2xl p-4 space-y-2 border border-[#dce9ff] mb-4">
        <h3 className="font-headline text-[14px] font-bold text-[#0b1c30]">
          Actions Rapides sur la Ligne
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => showToast('Tarification dynamique ajustée')}
            className="p-3 bg-white rounded-xl text-left shadow-xs border border-[#dce9ff] hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#ff6b00] mb-1">
              <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
            </div>
            <p className="font-headline text-[12px] text-[#0b1c30] font-bold">Modifier Prix</p>
            <p className="font-body text-[10px] text-[#5a4136]">Ajuster tarif dynamique</p>
          </button>

          <button
            type="button"
            onClick={() => showToast('Fauteuil marqué défectueux')}
            className="p-3 bg-white rounded-xl text-left shadow-xs border border-[#dce9ff] hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a] mb-1">
              <span className="material-symbols-outlined text-[18px]">block</span>
            </div>
            <p className="font-headline text-[12px] text-[#0b1c30] font-bold">Bloquer Panne</p>
            <p className="font-body text-[10px] text-[#5a4136]">Fauteuil défectueux</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('partner-manifest')}
            className="p-3 bg-white rounded-xl text-left shadow-xs border border-[#dce9ff] hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#a5f0be] flex items-center justify-center text-[#00522e] mb-1">
              <span className="material-symbols-outlined text-[18px]">file_download</span>
            </div>
            <p className="font-headline text-[12px] text-[#0b1c30] font-bold">Feuille Chauffeur</p>
            <p className="font-body text-[10px] text-[#5a4136]">PDF manifeste officiel</p>
          </button>

          <button
            type="button"
            onClick={() => showToast('Ventes guichet suspendues')}
            className="p-3 bg-white rounded-xl text-left shadow-xs border border-[#dce9ff] hover:shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#565e74] mb-1">
              <span className="material-symbols-outlined text-[18px]">pause_circle</span>
            </div>
            <p className="font-headline text-[12px] text-[#0b1c30] font-bold">Geler Ventes</p>
            <p className="font-body text-[10px] text-[#5a4136]">Arrêt guichets</p>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
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
