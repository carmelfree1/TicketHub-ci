import { Link } from 'react-router';
import { legal } from './legal-config';
import { LegalLayout, List, Section, Value } from './LegalLayout';

export function Component() {
  return (
    <LegalLayout
      title="Conditions d’utilisation"
      intro="Ces conditions s’appliquent à l’utilisation de TicketHub CI et à l’achat de billets sur le service. En créant un compte, vous les acceptez."
    >
      <Section title="1. Qui fait quoi">
        <p>
          TicketHub CI, édité par <Value value={legal.companyName} />, est une plateforme qui met en relation des clients avec des sociétés de transport et des
          organisateurs d’événements indépendants (les « professionnels »). Le contrat de transport ou d’accès à l’événement est conclu entre vous et le professionnel.
          TicketHub CI réserve vos places, encaisse le paiement pour son compte et émet votre billet.
        </p>
      </Section>

      <Section title="2. Votre compte">
        <List
          items={[
            'Vous devez fournir un nom et un numéro de téléphone ivoirien exacts et choisir un mot de passe d’au moins 10 caractères.',
            'Vous êtes responsable de la confidentialité de vos identifiants. Après plusieurs échecs de connexion, le compte est verrouillé quelques minutes pour votre protection.',
            'Un compte partenaire n’est créé que sur invitation de la société concernée.',
          ]}
        />
      </Section>

      <Section title="3. Réserver et payer">
        <List
          items={[
            'Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises, tels que fixés par le professionnel.',
            'Lorsque vous confirmez votre choix, vos places sont réservées pendant 10 minutes pour vous laisser le temps de payer. Passé ce délai, elles sont remises en vente.',
            'Le paiement s’effectue sur la page sécurisée de GeniusPay (Wave, Orange Money, MTN MoMo, Moov Money ou carte bancaire). La commande n’est confirmée, et les billets ne sont émis, qu’après confirmation du paiement par la passerelle ; revenir sur le site après avoir payé ne suffit pas.',
            'Si votre paiement est reçu après l’expiration du délai de 10 minutes, nous ne pouvons pas garantir que vos places soient encore disponibles : la commande est alors vérifiée par notre équipe, qui vous contacte, et vous êtes remboursé si les places ne peuvent pas vous être attribuées.',
          ]}
        />
      </Section>

      <Section title="4. Vos billets">
        <List
          items={[
            'Chaque billet porte un QR code personnel, disponible dans la rubrique « Mes billets ». Il est contrôlé à l’embarquement ou à l’entrée et ne peut servir qu’une seule fois.',
            'Ne partagez pas votre QR code et n’en publiez pas de photo : toute personne qui le présente en premier peut utiliser le billet. Un billet déjà contrôlé ne peut être ni remboursé ni réutilisé.',
            'Présentez-vous à l’heure indiquée par le professionnel, avec une pièce d’identité si le professionnel l’exige.',
          ]}
        />
      </Section>

      <Section title="5. Annulation et remboursement">
        <List
          items={[
            'Si le professionnel annule le départ ou l’événement, vous êtes remboursé du prix des billets concernés.',
            'Dans les autres cas, vous pouvez demander un remboursement depuis votre compte pour une commande payée. Chaque demande est examinée par notre équipe, qui vous répond ; les conditions propres au professionnel (délais, frais) s’appliquent.',
            'Un remboursement est effectué par la passerelle de paiement sur le moyen utilisé pour payer. Les billets remboursés sont annulés et ne donnent plus accès.',
          ]}
        />
      </Section>

      <Section title="6. Responsabilité">
        <p>
          Le professionnel est responsable de l’exécution du transport ou de l’événement (horaires, retards, conditions de voyage, bagages, sécurité). TicketHub CI est
          responsable de la bonne exécution de la réservation, du paiement et de l’émission des billets. Nous ne pouvons pas être tenus responsables d’une interruption
          due à un événement indépendant de notre volonté (panne de réseau, d’un opérateur Mobile Money ou de la passerelle de paiement) ; nous faisons le nécessaire pour
          rétablir votre commande lorsque cela arrive.
        </p>
      </Section>

      <Section title="7. Usages interdits">
        <List
          items={[
            'Utiliser le service pour frauder, contourner le contrôle des billets ou perturber le service.',
            'Créer plusieurs comptes pour contourner une limite ou revendre des billets de façon organisée.',
            'Tenter d’accéder aux données d’un autre utilisateur ou d’une autre société.',
          ]}
        />
        <p>Nous pouvons suspendre un compte qui contrevient à ces règles.</p>
      </Section>

      <Section title="8. Vos données">
        <p>
          Les données personnelles sont traitées comme décrit dans la <Link to="/confidentialite" className="text-[#a04100] underline underline-offset-2">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section title="9. Modification des conditions">
        <p>
          Nous pouvons modifier ces conditions ; la version en vigueur est celle indiquée en haut de cette page. Les commandes déjà payées restent soumises aux conditions
          en vigueur au moment de l’achat.
        </p>
      </Section>

      <Section title="10. Droit applicable et réclamations">
        <p>
          Ces conditions sont soumises au droit ivoirien. En cas de difficulté, écrivez d’abord à <Value value={legal.contactEmail} /> : nous cherchons une solution amiable. À défaut,
          les tribunaux compétents d’Abidjan sont saisis, sous réserve des règles protectrices applicables aux consommateurs.
        </p>
      </Section>
    </LegalLayout>
  );
}
