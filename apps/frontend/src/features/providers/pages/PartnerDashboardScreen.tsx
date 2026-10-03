import React, { useState } from 'react';
import { AppScreen } from '@/types';

interface PartnerDashboardScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

export const PartnerDashboardScreen: React.FC<PartnerDashboardScreenProps> = ({
  onNavigate,
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  return (
    <div className="flex flex-col w-full pb-24 max-w-md mx-auto px-4 pt-2">
      {/* Header Greeting & Station Badge */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px] fill">verified</span>
              Compte Vérifié CI
            </span>
            <span className="text-[#565e74] font-body text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#216b43] animate-pulse"></span>
              Sync Live
            </span>
          </div>
          <div className="text-right">
            <span className="text-[#a04100] font-headline text-[18px] font-bold tracking-tight">
              UTB
            </span>
          </div>
        </div>

        <div>
          <h2 className="font-headline text-[22px] font-bold text-[#0b1c30] tracking-tight leading-tight">
            Bonjour, Gare Adjamé UTB
          </h2>
          <p className="font-body text-[12px] text-[#5a4136]">
            Supervision centrale des rotations &amp; encaissements GeniusPay
          </p>
        </div>

        {/* Segmented Period Switcher */}
        <div className="flex p-1 rounded-xl bg-[#dce9ff] gap-1">
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`flex-1 py-1.5 rounded-lg font-headline text-[11px] font-bold text-center transition-all duration-200 cursor-pointer ${
              period === 'today'
                ? 'bg-white shadow-xs text-[#0b1c30]'
                : 'text-[#565e74] hover:text-[#0b1c30]'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`flex-1 py-1.5 rounded-lg font-headline text-[11px] font-bold text-center transition-all duration-200 cursor-pointer ${
              period === 'week'
                ? 'bg-white shadow-xs text-[#0b1c30]'
                : 'text-[#565e74] hover:text-[#0b1c30]'
            }`}
          >
            Cette semaine
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`flex-1 py-1.5 rounded-lg font-headline text-[11px] font-bold text-center transition-all duration-200 cursor-pointer ${
              period === 'month'
                ? 'bg-white shadow-xs text-[#0b1c30]'
                : 'text-[#565e74] hover:text-[#0b1c30]'
            }`}
          >
            Ce mois
          </button>
        </div>
      </div>

      {/* Financial KPI Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-[#e2bfb0]/30 mb-3">
        <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-[#ffb693]/20 pointer-events-none blur-2xl"></div>
        <div className="flex flex-col gap-3 relative">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-headline text-[10px] uppercase tracking-wider text-[#5a4136] font-bold">
                Chiffre d'Affaires Brut
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-headline text-[28px] font-bold text-[#a04100] tracking-tight leading-none">
                  2 845 000
                </span>
                <span className="font-headline text-[14px] text-[#a04100] font-bold">
                  FCFA
                </span>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[11px] font-bold gap-0.5">
              <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
              +14%
            </span>
          </div>

          {/* Payment Breakdown Bar */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between items-center font-headline text-[11px] text-[#5a4136]">
              <span>Répartition GeniusPay Direct</span>
              <span className="text-[#216b43] font-bold">100% Mobile Money</span>
            </div>

            <div className="w-full h-3 rounded-full bg-[#eff4ff] flex overflow-hidden border border-[#dce9ff]">
              <div className="h-full bg-[#ff6b00]" style={{ width: '62%' }} title="Wave: 62%"></div>
              <div className="h-full bg-[#a04100]" style={{ width: '24%' }} title="Orange: 24%"></div>
              <div className="h-full bg-[#216b43]" style={{ width: '14%' }} title="MTN: 14%"></div>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]"></span>
                <span className="font-body text-[11px] text-[#0b1c30]">Wave 62%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a04100]"></span>
                <span className="font-body text-[11px] text-[#0b1c30]">Orange 24%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#216b43]"></span>
                <span className="font-body text-[11px] text-[#0b1c30]">MTN 14%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary KPIs Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Billetterie & Taux */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#e2bfb0]/30 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase">
              Billetterie
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#ff6b00]">
              <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
            </div>
          </div>
          <div>
            <div className="font-headline text-[20px] font-bold text-[#0b1c30] leading-tight">
              384 <span className="font-body text-[12px] text-[#5a4136] font-normal">/ 420</span>
            </div>
            <p className="font-headline text-[11px] text-[#216b43] font-bold mt-0.5">
              91.4% d'occupation
            </p>
          </div>
          <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden mt-0.5">
            <div className="bg-[#216b43] h-full rounded-full" style={{ width: '91.4%' }}></div>
          </div>
        </div>

        {/* Scannés & Ponctualité */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-[#e2bfb0]/30 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[10px] text-[#5a4136] font-bold uppercase">
              Embarqués
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#216b43]">
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            </div>
          </div>
          <div>
            <div className="font-headline text-[20px] font-bold text-[#0b1c30] leading-tight">
              312 <span className="font-body text-[12px] text-[#5a4136] font-normal">scannés</span>
            </div>
            <div className="flex items-center gap-1 font-body text-[11px] text-[#5a4136] mt-0.5">
              <span className="material-symbols-outlined text-[13px] text-[#216b43]">schedule</span>
              <span>Ponctualité <strong className="text-[#0b1c30]">98%</strong></span>
            </div>
          </div>
          <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden mt-0.5">
            <div className="bg-[#ff6b00] h-full rounded-full" style={{ width: '81.2%' }}></div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="flex flex-col gap-1.5 mb-4">
        <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">
          Actions Rapides
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onNavigate('partner-fleet')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-xs border border-[#e2bfb0]/30 hover:bg-[#eff4ff] active:scale-95 transition-all text-center gap-1 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#ffdbcc] text-[#a04100] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">add_road</span>
            </div>
            <span className="font-headline text-[11px] font-bold text-[#0b1c30]">Nouveau Trajet</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('partner-scanner')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-[#a04100] to-[#ff6b00] text-white shadow-sm hover:opacity-95 active:scale-95 transition-all text-center gap-1 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">document_scanner</span>
            </div>
            <span className="font-headline text-[11px] font-bold text-white">Scanner Billets</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('partner-manifest')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-xs border border-[#e2bfb0]/30 hover:bg-[#eff4ff] active:scale-95 transition-all text-center gap-1 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#a5f0be] text-[#00522e] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">file_download</span>
            </div>
            <span className="font-headline text-[11px] font-bold text-[#0b1c30]">Manifeste PDF</span>
          </button>
        </div>
      </div>

      {/* Immediate Departures Section */}
      <div className="flex flex-col gap-2.5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="font-headline text-[15px] font-bold text-[#0b1c30]">
              Départs Immédiats
            </h3>
            <span className="w-2 h-2 rounded-full bg-[#ff6b00] animate-ping"></span>
          </div>
          <span className="font-headline text-[11px] text-[#5a4136] font-bold">
            3 rotations actives
          </span>
        </div>

        {/* Departure Card 1 : In Boarding */}
        <div className="flex flex-col rounded-2xl bg-white shadow-sm border border-[#e2bfb0]/30 overflow-hidden">
          <div className="p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[#ffdad6] text-[#93000a] font-headline text-[10px] font-bold uppercase">
                  Complet
                </span>
                <span className="font-headline text-[11px] text-[#5a4136] font-bold">
                  Car VIP #12
                </span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#a5f0be] text-[#00522e] font-headline text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#216b43] animate-pulse"></span>
                Embarquement en cours
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="font-headline text-[15px] font-bold text-[#0b1c30]">
                  Abidjan (Adjamé) → Yamoussoukro
                </span>
                <span className="font-body text-[12px] text-[#5a4136]">
                  Départ programmé : <strong className="text-[#0b1c30]">08:30</strong> (Quai 2)
                </span>
              </div>
            </div>

            {/* Boarding Progress */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex justify-between items-center font-headline text-[11px]">
                <span className="text-[#5a4136]">Passagers scannés à la porte</span>
                <span className="font-bold text-[#0b1c30]">38 / 41 passagers</span>
              </div>
              <div className="w-full bg-[#eff4ff] h-2 rounded-full overflow-hidden">
                <div className="bg-[#216b43] h-full rounded-full" style={{ width: '92.6%' }}></div>
              </div>
            </div>
          </div>

          {/* Ticket Perforation Divider */}
          <div className="relative flex items-center justify-between bg-[#eff4ff] px-3 py-1">
            <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#f8f9ff]"></div>
            <div className="w-full border-t border-dashed border-[#e2bfb0]/60"></div>
            <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#f8f9ff]"></div>
          </div>

          <div className="p-3 bg-[#eff4ff] flex items-center justify-between gap-2 border-t border-[#dce9ff]">
            <div className="flex items-center gap-1 text-[#5a4136] font-body text-[11px]">
              <span className="material-symbols-outlined text-[15px] text-[#ba1a1a]">
                priority_high
              </span>
              <span>3 retardataires attendus</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('partner-manifest')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff842b] text-white font-headline text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>Ouvrir Manifeste / Scanner</span>
            </button>
          </div>
        </div>

        {/* Departure Card 2 : Bouaké */}
        <div className="flex flex-col rounded-2xl bg-white shadow-sm border border-[#e2bfb0]/30 p-3.5 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#dce9ff] text-[#0b1c30] font-headline text-[10px] font-bold uppercase">
                34/44 Places
              </span>
              <span className="font-headline text-[11px] text-[#5a4136] font-bold">
                Car Confort #08
              </span>
            </div>
            <span className="font-headline text-[11px] text-[#216b43] font-bold">
              Ventes ouvertes (77%)
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="font-headline text-[14px] font-bold text-[#0b1c30]">
                Abidjan (Treichville) → Bouaké
              </span>
              <span className="font-body text-[11px] text-[#5a4136]">
                Départ : <strong className="text-[#0b1c30]">10:15</strong>
              </span>
            </div>
            <span className="font-headline text-[14px] text-[#a04100] font-bold">
              9 000 FCFA
            </span>
          </div>
          <div className="w-full bg-[#eff4ff] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#ff6b00] h-full rounded-full" style={{ width: '77%' }}></div>
          </div>
        </div>
      </div>

      {/* Live Sales Feed (GeniusPay Webhooks) */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#216b43]">bolt</span>
            <h3 className="font-headline text-[14px] font-bold text-[#0b1c30]">
              Dernières Ventes en Direct
            </h3>
          </div>
          <span className="font-body text-[11px] text-[#5a4136]">GeniusPay Webhook</span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white shadow-xs border border-[#e2bfb0]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#a5f0be] text-[#00522e] flex items-center justify-center font-bold font-headline text-[12px]">
                AK
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-[13px] font-bold text-[#0b1c30]">
                  Awa Koné
                </span>
                <span className="font-body text-[11px] text-[#5a4136]">
                  Siège 14 • Yamoussoukro (08:30)
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-headline text-[13px] text-[#0b1c30] font-bold">
                6 500 FCFA
              </span>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.2 rounded bg-[#a5f0be] text-[#00522e] font-headline text-[9px] font-bold">
                  PAID
                </span>
                <span className="font-body text-[10px] text-[#5a4136]">08:12</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white shadow-xs border border-[#e2bfb0]/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#ffdbcc] text-[#a04100] flex items-center justify-center font-bold font-headline text-[12px]">
                IK
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-[13px] font-bold text-[#0b1c30]">
                  Ibrahim Kouassi
                </span>
                <span className="font-body text-[11px] text-[#5a4136]">
                  Siège 04 • Bouaké (10:15)
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-headline text-[13px] text-[#0b1c30] font-bold">
                9 000 FCFA
              </span>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.2 rounded bg-[#a5f0be] text-[#00522e] font-headline text-[9px] font-bold">
                  PAID
                </span>
                <span className="font-body text-[10px] text-[#5a4136]">08:08</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Station Assistance */}
      <div className="rounded-2xl bg-[#eff4ff] p-3.5 flex items-center gap-2.5 border border-[#dce9ff]">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#ff6b00] flex-shrink-0 shadow-xs">
          <span className="material-symbols-outlined text-[20px]">support_agent</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-headline text-[12px] font-bold text-[#0b1c30] truncate">
            Assistance Guichet Express
          </span>
          <span className="font-body text-[11px] text-[#5a4136]">
            Besoin d'un car supplémentaire ? Contactez le régulateur UTB Abidjan.
          </span>
        </div>
      </div>
    </div>
  );
};
