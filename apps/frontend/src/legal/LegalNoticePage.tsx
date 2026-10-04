import { legal } from './legal-config';
import { LegalLayout, List, Section, Value } from './LegalLayout';

export function Component() {
  return (
    <LegalLayout title="Mentions légales">
      <Section title="Éditeur du site">
        <List
          items={[
            <>Dénomination : <Value value={legal.companyName} /></>,
            <>Forme juridique : <Value value={legal.legalForm} />{legal.shareCapital ? `, capital de ${legal.shareCapital}` : ''}</>,
            <>Immatriculation (RCCM) : <Value value={legal.registrationNumber} /></>,
            ...(legal.taxNumber ? [<>Numéro de contribuable : {legal.taxNumber}</>] : []),
            <>Siège social : <Value value={legal.address} /></>,
            <>Courriel : <Value value={legal.contactEmail} /></>,
            <>Téléphone : <Value value={legal.contactPhone} /></>,
            <>Directeur de la publication : <Value value={legal.publicationDirector} /></>,
          ]}
        />
      </Section>

      <Section title="Hébergement">
        <List
          items={[
            <>Hébergeur : <Value value={legal.hostName} /></>,
            <>Adresse : <Value value={legal.hostAddress} /></>,
            <>Pays d’hébergement des données : <Value value={legal.hostingCountry} /></>,
          ]}
        />
      </Section>

      <Section title="Nature du service">
        <p>
          TicketHub CI permet de réserver et de payer en ligne des billets de bus interurbains et des billets d’événements proposés par des
          sociétés de transport et des organisateurs indépendants. Le contrat de transport ou d’accès à l’événement est conclu entre le
          client et le transporteur ou l’organisateur concerné ; voir les conditions d’utilisation.
        </p>
      </Section>

      <Section title="Paiement">
        <p>Les paiements sont traités par la passerelle GeniusPay. TicketHub CI ne reçoit ni ne conserve de numéro de carte bancaire ni de code PIN Mobile Money.</p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la politique de confidentialité.
          {legal.artciReference ? ` Déclaration ou autorisation auprès de l’ARTCI : ${legal.artciReference}.` : ''}
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Le nom TicketHub CI, le logo, les textes et le code de l’application sont la propriété de l’éditeur, sauf mention contraire. Les noms,
          logos et visuels des transporteurs et des organisateurs appartiennent à leurs titulaires respectifs.
        </p>
      </Section>

      <Section title="Contact">
        <p>Pour toute question ou réclamation : <Value value={legal.contactEmail} /> ou <Value value={legal.contactPhone} />.</p>
      </Section>
    </LegalLayout>
  );
}
