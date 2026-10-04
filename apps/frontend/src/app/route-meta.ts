export interface RouteMeta {
  /** Page specific part of the browser title; null means the home title. */
  title: string | null;
  description: string;
  /** Pages that hold personal or transient data must never be indexed. */
  indexable: boolean;
}

const SITE = 'TicketHub CI';
export const HOME_TITLE = `${SITE} | Billets de bus et d’événements en Côte d’Ivoire`;
const DEFAULT_DESCRIPTION =
  'Réservez vos billets de bus interurbains et d’événements en Côte d’Ivoire et payez par Mobile Money. Retrouvez vos billets QR dans votre compte.';

const priv = (title: string): RouteMeta => ({ title, description: DEFAULT_DESCRIPTION, indexable: false });

/** Title, description and indexing policy for a URL path. Pure so it can be tested without a browser. */
export function routeMeta(pathname: string): RouteMeta {
  if (pathname === '/') return { title: null, description: DEFAULT_DESCRIPTION, indexable: true };
  if (pathname === '/conditions') {
    return { title: 'Conditions d’utilisation', description: 'Conditions d’utilisation de TicketHub CI : réservation, paiement, billets, annulation et remboursement.', indexable: true };
  }
  if (pathname === '/confidentialite') {
    return { title: 'Politique de confidentialité', description: 'Données personnelles collectées par TicketHub CI, finalités, durées de conservation et vos droits.', indexable: true };
  }
  if (pathname === '/mentions-legales') {
    return { title: 'Mentions légales', description: 'Éditeur, hébergeur et contact de TicketHub CI.', indexable: true };
  }
  if (pathname.startsWith('/trajets/')) return priv('Choix des sièges');
  if (pathname.startsWith('/evenements/')) return priv('Choix des billets');
  if (pathname === '/paiement' || pathname === '/paiement/retour') return priv('Paiement');
  if (pathname === '/billets') return priv('Mes billets');
  if (pathname.startsWith('/billets/')) return priv('Billet');
  if (pathname.startsWith('/partenaire')) return priv('Espace partenaire');
  return priv('Page introuvable');
}

export function documentTitle(meta: RouteMeta): string {
  return meta.title ? `${meta.title} | ${SITE}` : HOME_TITLE;
}

/** Public pages listed in the sitemap, in the order they should appear. */
export const SITEMAP_PATHS = ['/', '/conditions', '/confidentialite', '/mentions-legales'] as const;
