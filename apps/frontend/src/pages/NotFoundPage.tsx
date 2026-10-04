import { Link } from 'react-router';
import { StatusPanel, primaryActionClass } from '@/components/feedback/StatusPanel';

export function NotFoundPage() {
  return (
    <StatusPanel
      tone="empty"
      icon="search_off"
      title="Page introuvable"
      description="L’adresse demandée n’existe pas ou a été déplacée. Vérifiez le lien, ou revenez au catalogue."
      actions={<Link to="/" className={primaryActionClass}>Retour au catalogue</Link>}
    />
  );
}
