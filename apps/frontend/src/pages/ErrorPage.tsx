import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { StatusPanel, primaryActionClass, secondaryActionClass } from '@/components/feedback/StatusPanel';

/** Rendered by the router for any error thrown while rendering or loading a route, and for unknown URLs. */
export function ErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <StatusPanel
        tone="empty"
        icon="search_off"
        title="Page introuvable"
        description="L’adresse demandée n’existe pas ou a été déplacée."
        actions={<Link to="/" className={primaryActionClass}>Retour au catalogue</Link>}
      />
    );
  }
  if (import.meta.env.DEV) console.error(error);
  return (
    <StatusPanel
      tone="error"
      title="Une erreur est survenue"
      description="Cette page n’a pas pu s’afficher. Vos données n’ont pas été modifiées. Rechargez la page, ou revenez au catalogue."
      actions={
        <>
          <button type="button" onClick={() => window.location.reload()} className={primaryActionClass}>Recharger la page</button>
          <a href="/" className={secondaryActionClass}>Retour au catalogue</a>
        </>
      }
    />
  );
}
