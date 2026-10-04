import { Link } from 'react-router';
import { StatusPanel, primaryActionClass, secondaryActionClass } from '@/components/feedback/StatusPanel';

interface UnauthorizedPageProps {
  /** Present when the visitor is signed out and could simply sign in. */
  onSignIn?: () => void;
}

export function UnauthorizedPage({ onSignIn }: UnauthorizedPageProps) {
  return (
    <StatusPanel
      tone="info"
      icon="lock"
      title={onSignIn ? 'Connexion requise' : 'Accès réservé'}
      description={
        onSignIn
          ? 'Connectez-vous avec votre compte partenaire pour accéder à cet espace.'
          : 'Votre compte n’a pas les droits nécessaires pour consulter cette page.'
      }
      actions={
        <>
          {onSignIn && <button type="button" onClick={onSignIn} className={primaryActionClass}>Se connecter</button>}
          <Link to="/" className={secondaryActionClass}>Retour au catalogue</Link>
        </>
      }
    />
  );
}
