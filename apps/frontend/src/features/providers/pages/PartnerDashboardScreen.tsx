import React, { useEffect, useState } from 'react';
import { formatXof } from '@tickethub/shared';
import { type AppScreen } from '@/types';
import { ApiError, type PartnerProvider, type PartnerStats, type StatsPeriod } from '@/services/api';
import { ticketsApi } from '@/features/tickets/api';

interface PartnerDashboardScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

const periods: Array<{ id: StatsPeriod; label: string }> = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'week', label: '7 jours' },
  { id: 'month', label: 'Ce mois' },
];

const roleLabel: Record<PartnerProvider['role'], string> = { owner: 'Propriétaire', manager: 'Gestionnaire', scanner: 'Contrôleur' };

const actions: Array<{ label: string; description: string; icon: string; screen: AppScreen }> = [
  { label: 'Scanner un billet', description: 'Contrôlez un QR code ou saisissez le code du billet à l’embarquement.', icon: 'qr_code_scanner', screen: 'partner-scanner' },
  { label: 'Manifeste d’un départ', description: 'Consultez les voyageurs d’un départ, leur siège et l’état de leur billet.', icon: 'list_alt', screen: 'partner-manifest' },
];

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[#e6e9f2] bg-white p-4">
      <p className="font-body text-[12px] text-[#5a4136]">{label}</p>
      <p className="mt-1 font-headline text-[22px] font-bold leading-tight text-[#0b1c30]">{value}</p>
      {hint && <p className="mt-0.5 font-body text-[11px] text-[#5a4136]">{hint}</p>}
    </div>
  );
}

export const PartnerDashboardScreen: React.FC<PartnerDashboardScreenProps> = ({ onNavigate }) => {
  const [providers, setProviders] = useState<PartnerProvider[] | null>(null);
  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [error, setError] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    let active = true;
    ticketsApi.partnerMe()
      .then((result) => { if (active) setProviders(result); })
      .catch((cause: unknown) => { if (active) { setProviders([]); setError(cause instanceof Error ? cause.message : 'Impossible de charger votre société.'); } });
    return () => { active = false; };
  }, []);

  const linked = (providers?.length ?? 0) > 0;

  useEffect(() => {
    if (!linked) return;
    let active = true;
    setLoadingStats(true);
    setError('');
    ticketsApi.partnerStats(period)
      .then((result) => { if (active) setStats(result); })
      .catch((cause: unknown) => {
        if (!active) return;
        setStats(null);
        setError(cause instanceof ApiError && cause.code === 'MFA_SETUP_REQUIRED'
          ? 'Activez la double authentification depuis votre compte pour consulter ces chiffres.'
          : 'Les statistiques n’ont pas pu être chargées. Réessayez dans un instant.');
      })
      .finally(() => { if (active) setLoadingStats(false); });
    return () => { active = false; };
  }, [linked, period]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-headline text-[26px] font-bold leading-tight text-[#0b1c30]">Espace partenaire</h1>
        {providers === null ? (
          <p className="font-body text-[14px] text-[#5a4136]">Chargement…</p>
        ) : linked ? (
          <p className="font-body text-[14px] leading-relaxed text-[#5a4136]">
            {providers.map((provider) => `${provider.name} (${roleLabel[provider.role]})`).join(', ')}
          </p>
        ) : null}
      </header>

      {providers !== null && !linked && (
        <section role="status" className="rounded-xl border border-[#ffcbb0] bg-[#fff1e8] p-4">
          <h2 className="font-headline text-[15px] font-bold text-[#0b1c30]">Compte non rattaché à une société</h2>
          <p className="mt-1 font-body text-[13px] leading-relaxed text-[#5a4136]">
            Vous ne pouvez ni scanner de billets ni consulter de manifestes tant que ce compte n’est pas lié à votre société. Demandez à votre
            société un code d’invitation, puis créez un nouveau compte partenaire avec ce code.
          </p>
        </section>
      )}

      {linked && (
        <section aria-labelledby="stats-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="stats-title" className="font-headline text-[18px] font-bold text-[#0b1c30]">Ventes</h2>
            <div role="group" aria-label="Période" className="flex gap-1 rounded-lg bg-[#eff4ff] p-1">
              {periods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={period === item.id}
                  onClick={() => setPeriod(item.id)}
                  className={`min-h-[36px] rounded-md px-3 font-headline text-[12px] font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                    period === item.id ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-[#5a4136]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="rounded-lg bg-[#ffdad6] px-3 py-2 font-body text-[13px] text-[#93000a]">{error}</p>}

          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${loadingStats ? 'opacity-60' : ''}`} aria-busy={loadingStats}>
            <Figure label="Ventes brutes" value={stats ? `${formatXof(stats.grossXof)} FCFA` : '-'} hint={stats ? `${stats.orders} commande${stats.orders > 1 ? 's' : ''}` : undefined} />
            <Figure label="Net après commission" value={stats ? `${formatXof(stats.netXof)} FCFA` : '-'} hint={stats ? `Commission : ${formatXof(stats.commissionXof)} FCFA` : undefined} />
            <Figure label="Billets vendus" value={stats ? String(stats.ticketsSold) : '-'} />
            <Figure label="Billets contrôlés" value={stats ? String(stats.ticketsScanned) : '-'} />
          </div>
          <p className="font-body text-[12px] text-[#5a4136]">
            Chiffres calculés à partir des commandes payées. Les remboursements en cours de traitement ne sont pas déduits.
          </p>
        </section>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={action.screen}>
            <button
              type="button"
              onClick={() => onNavigate(action.screen)}
              disabled={!linked}
              className="flex h-full w-full items-start gap-3 rounded-xl border border-[#e6e9f2] bg-white p-4 text-left hover:border-[#c9d7ff] hover:bg-[#f8faff] disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#0b1c30] text-white" aria-hidden="true">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{action.icon}</span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-headline text-[16px] font-bold text-[#0b1c30]">{action.label}</span>
                <span className="font-body text-[13px] leading-snug text-[#5a4136]">{action.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
