import type { ReactNode } from 'react';

type Tone = 'loading' | 'error' | 'empty' | 'info';

interface StatusPanelProps {
  tone: Tone;
  title: string;
  description?: string;
  icon?: string;
  actions?: ReactNode;
}

const toneIcon: Record<Tone, string> = { loading: 'progress_activity', error: 'error', empty: 'inbox', info: 'info' };
const toneStyle: Record<Tone, string> = {
  loading: 'bg-[#eff4ff] text-[#565e74]',
  error: 'bg-[#ffdad6] text-[#93000a]',
  empty: 'bg-[#eff4ff] text-[#565e74]',
  info: 'bg-[#ffdbcc] text-[#a04100]',
};

/** One layout for every loading, empty and failure state so they look and read the same everywhere. */
export function StatusPanel({ tone, title, description, icon, actions }: StatusPanelProps) {
  return (
    <section
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className="mx-auto w-full max-w-md px-4 py-16 flex flex-col items-center text-center gap-4"
    >
      <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${toneStyle[tone]}`} aria-hidden="true">
        <span className={`material-symbols-outlined text-[28px] ${tone === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">{icon ?? toneIcon[tone]}</span>
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-headline text-[18px] font-bold text-[#0b1c30]">{title}</h1>
        {description && <p className="font-body text-[14px] leading-relaxed text-[#5a4136]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </section>
  );
}

export const actionButtonClass =
  'inline-flex min-h-[44px] items-center justify-center px-4 rounded-xl font-headline text-[13px] font-bold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c2410c] focus-visible:ring-offset-2';
export const primaryActionClass = `${actionButtonClass} bg-[#c2410c] text-white hover:bg-[#9a3412]`;
export const secondaryActionClass = `${actionButtonClass} bg-white border border-[#dce9ff] text-[#0b1c30] hover:bg-[#eff4ff]`;
