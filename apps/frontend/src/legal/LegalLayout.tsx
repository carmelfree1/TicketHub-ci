import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { TERMS_VERSION } from '@tickethub/shared';
import { legalIsComplete } from './legal-config';

export const legalLinks = [
  { to: '/conditions', label: 'Conditions d’utilisation' },
  { to: '/confidentialite', label: 'Politique de confidentialité' },
  { to: '/mentions-legales', label: 'Mentions légales' },
] as const;

/** A value from the legal settings, or a visible marker while it is still missing. */
export function Value({ value }: { value: string }) {
  if (value) return <>{value}</>;
  return <mark className="rounded bg-[#ffe08a] px-1 text-[#4d3b00]">[à compléter]</mark>;
}

export function LegalLayout({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  const formatted = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(TERMS_VERSION));
  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6">
      {!legalIsComplete && (
        <p role="note" className="mb-4 rounded-lg border border-[#ffcf5c] bg-[#fff6dc] px-3 py-2 font-body text-[13px] text-[#4d3b00]">
          Informations légales incomplètes : les champs marqués « à compléter » doivent être renseignés avant la mise en ligne.
        </p>
      )}
      <h1 className="font-headline text-[28px] font-bold leading-tight text-[#0b1c30]">{title}</h1>
      <p className="mt-1 font-body text-[13px] text-[#5a4136]">Version du {formatted}</p>
      {intro && <p className="mt-4 font-body text-[15px] leading-relaxed text-[#0b1c30]">{intro}</p>}
      <div className="mt-6 flex flex-col gap-6 font-body text-[15px] leading-relaxed text-[#0b1c30]">{children}</div>
      <nav aria-label="Autres documents" className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#dce9ff] pt-4 font-body text-[13px]">
        {legalLinks.map((link) => (
          <Link key={link.to} to={link.to} className="text-[#a04100] underline underline-offset-2">{link.label}</Link>
        ))}
      </nav>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-headline text-[18px] font-bold text-[#0b1c30]">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
}
