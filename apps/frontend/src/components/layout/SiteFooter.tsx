import { Link } from 'react-router';
import { legal } from '@/legal/legal-config';
import { legalLinks } from '@/legal/LegalLayout';

/** Legal links on every page, as required for a commercial site. Sits above the fixed bottom navigation. */
export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#dce9ff] pt-4 font-body text-[13px]">
        {legalLinks.map((link) => (
          <Link key={link.to} to={link.to} className="text-[#4a5568] underline-offset-2 hover:text-[#0b1c30] hover:underline">{link.label}</Link>
        ))}
      </nav>
      <p className="mt-2 font-body text-[12px] text-[#5a4136]">© {new Date().getFullYear()} {legal.companyName || 'TicketHub CI'}</p>
    </footer>
  );
}
