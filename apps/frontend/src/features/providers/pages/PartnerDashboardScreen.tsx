import React from 'react';
import { type AppScreen } from '@/types';

interface PartnerDashboardScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

const actions: Array<{ label: string; description: string; icon: string; screen: AppScreen }> = [
  {
    label: 'Scanner un billet',
    description: 'Contrôlez un QR code ou saisissez le code du billet à l’embarquement.',
    icon: 'qr_code_scanner',
    screen: 'partner-scanner',
  },
  {
    label: 'Manifeste d’un départ',
    description: 'Consultez les voyageurs d’un départ, leur siège et l’état de leur billet.',
    icon: 'list_alt',
    screen: 'partner-manifest',
  },
];

export const PartnerDashboardScreen: React.FC<PartnerDashboardScreenProps> = ({ onNavigate }) => (
  <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-1">
      <h1 className="font-headline text-[26px] font-bold leading-tight text-[#0b1c30]">Espace partenaire</h1>
      <p className="font-body text-[14px] leading-relaxed text-[#5a4136]">
        Outils de contrôle à l’embarquement. Chaque scan est enregistré dans le journal d’audit.
      </p>
    </header>

    <ul className="grid gap-3 sm:grid-cols-2">
      {actions.map((action) => (
        <li key={action.screen}>
          <button
            type="button"
            onClick={() => onNavigate(action.screen)}
            className="flex h-full w-full items-start gap-3 rounded-xl border border-[#e6e9f2] bg-white p-4 text-left hover:border-[#c9d7ff] hover:bg-[#f8faff] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
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

    <section aria-labelledby="stats-title" className="rounded-xl border border-dashed border-[#c9d7ff] bg-white p-5">
      <h2 id="stats-title" className="font-headline text-[15px] font-bold text-[#0b1c30]">Statistiques de vente</h2>
      <p className="mt-1 font-body text-[13px] leading-relaxed text-[#5a4136]">
        Les chiffres de ventes et de reversements ne sont pas encore disponibles dans cet espace. Ils seront affichés ici lorsque
        le rattachement de votre compte à votre société sera en place.
      </p>
    </section>
  </div>
);
