import React, { useMemo, useState } from 'react';
import { type AppScreen } from '@/types';

interface PartnerDashboardScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

const quickStats = [
  { label: 'Revenu du jour', value: '2 845 000 FCFA', trend: '+14%', tone: 'amber' },
  { label: 'Places vendues', value: '384 / 420', trend: '91.4%', tone: 'green' },
  { label: 'Billets scannés', value: '312', trend: '98% ponctualité', tone: 'blue' },
];

const recentActivity = [
  { name: 'Awa Koné', route: 'Abidjan → Yamoussoukro', amount: '6 500 FCFA', status: 'Payé' },
  { name: 'Ibrahim Kouassi', route: 'Abidjan → Bouaké', amount: '9 000 FCFA', status: 'Payé' },
  { name: 'Marie Ange Yao', route: 'Abidjan → Korhogo', amount: '7 200 FCFA', status: 'À vérifier' },
];

const actions = [
  { label: 'Nouveau trajet', icon: 'add_road', tone: 'amber', screen: 'partner-fleet' as AppScreen },
  { label: 'Scanner billets', icon: 'qr_code_scanner', tone: 'primary', screen: 'partner-scanner' as AppScreen },
  { label: 'Manifeste', icon: 'file_download', tone: 'green', screen: 'partner-manifest' as AppScreen },
];

export const PartnerDashboardScreen: React.FC<PartnerDashboardScreenProps> = ({ onNavigate }) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'week': return 'Cette semaine';
      case 'month': return 'Ce mois';
      default: return 'Aujourd’hui';
    }
  }, [period]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 pb-24 px-4 sm:px-6 lg:px-8 pt-3 lg:grid-cols-[1.1fr_0.9fr]">
      <header className="rounded-2xl border border-[#e6e9f2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-headline text-[10px] uppercase tracking-[0.14em] text-[#63708b]">Espace partenaire</p>
            <h2 className="mt-1 font-headline text-[22px] font-bold text-[#0b1c30]">Gare Adjamé UTB</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f9ee] px-2.5 py-1 text-[10px] font-bold text-[#1d6f42]">
            <span className="material-symbols-outlined text-[12px]">verified</span>
            En ligne
          </span>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl bg-[#edf1fb] p-1">
          {(['today', 'week', 'month'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                period === value ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-[#63708b]'
              }`}
            >
              {value === 'today' ? 'Jour' : value === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </header>

      <section className="rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1f2937] p-4 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300">Performance</p>
            <h3 className="mt-2 font-headline text-[28px] font-bold leading-none">2 845 000 FCFA</h3>
          </div>
          <span className="rounded-full bg-[#1de9b6]/15 px-2.5 py-1 text-[11px] font-bold text-[#9ef6d8]">+14%</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-300">
          <span>{periodLabel}</span>
          <span>Wave • Orange • MTN</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#f59e0b] via-[#fb923c] to-[#f97316]" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:col-span-2">
        {quickStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#e6e9f2] bg-white p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#63708b]">{stat.label}</p>
            <p className="mt-2 font-headline text-[18px] font-bold text-[#0b1c30]">{stat.value}</p>
            <p className={`mt-1 text-[10px] font-bold ${stat.tone === 'amber' ? 'text-[#a04100]' : stat.tone === 'green' ? 'text-[#1d6f42]' : 'text-[#2563eb]'}`}>
              {stat.trend}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#e6e9f2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-[18px] font-bold text-[#0b1c30]">Actions rapides</h3>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#63708b]">Ops</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onNavigate(action.screen)}
              className="rounded-2xl border border-[#e6e9f2] bg-[#f8fafc] p-3 text-center transition hover:border-[#c9d7ff] hover:bg-white"
            >
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${
                action.tone === 'amber' ? 'bg-[#fff1df] text-[#a04100]' : action.tone === 'primary' ? 'bg-[#e8f0ff] text-[#1d4ed8]' : 'bg-[#eafaf0] text-[#1d6f42]'
              }`}>
                <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
              </div>
              <span className="font-headline text-[11px] font-bold text-[#0b1c30]">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6e9f2] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-[18px] font-bold text-[#0b1c30]">Activité récente</h3>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#63708b]">Live</span>
        </div>

        <div className="mt-3 space-y-2">
          {recentActivity.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-xl bg-[#f8fafc] px-3 py-2.5">
              <div>
                <p className="font-headline text-[13px] font-bold text-[#0b1c30]">{item.name}</p>
                <p className="text-[11px] text-[#63708b]">{item.route}</p>
              </div>
              <div className="text-right">
                <p className="font-headline text-[13px] font-bold text-[#0b1c30]">{item.amount}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  item.status === 'Payé' ? 'bg-[#eafaf0] text-[#1d6f42]' : 'bg-[#fff1df] text-[#a04100]'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
