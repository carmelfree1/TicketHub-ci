import { legal } from './legal-config';
import { LegalLayout, List, Section, Value } from './LegalLayout';

export function Component() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      intro="Cette page explique quelles données personnelles TicketHub CI collecte, pourquoi, qui les reçoit, combien de temps elles sont gardées et comment exercer vos droits."
    >
      <Section title="Qui est responsable de vos données">
        <p>
          Le responsable du traitement est <Value value={legal.companyName} />, <Value value={legal.address} />. Pour toute question sur vos
          données : <Value value={legal.dataProtectionEmail} />.
        </p>
      </Section>

      <Section title="Les données que nous collectons">
        <List
          items={[
            <><strong>Compte :</strong> nom complet, numéro de téléphone et mot de passe. Le mot de passe est transformé de façon irréversible avant d’être enregistré ; nous ne pouvons pas le lire.</>,
            <><strong>Réservations et billets :</strong> départ ou événement choisi, sièges, quantité, montant, état de la commande, codes de billets et date de contrôle à l’entrée.</>,
            <><strong>Paiement :</strong> nous ne recevons ni ne conservons votre numéro de carte ni votre code PIN Mobile Money, qui sont saisis chez GeniusPay. Nous gardons la référence de la transaction, le montant, le moyen de paiement choisi et le résultat.</>,
            <><strong>Sécurité :</strong> adresse IP, type de navigateur et date des actions importantes (connexion, réservation, paiement, contrôle d’un billet), tentatives de connexion échouées. Si vous activez la double authentification : une clé chiffrée et des codes de secours conservés sous forme irréversible.</>,
            <><strong>Messages :</strong> les SMS que nous vous envoyons (confirmation, échec ou vérification d’un paiement, remboursement) et leur état d’envoi.</>,
          ]}
        />
        <p>Nous ne collectons pas votre position, vos contacts ni votre pièce d’identité.</p>
      </Section>

      <Section title="Pourquoi nous les utilisons">
        <List
          items={[
            'Exécuter votre réservation : bloquer vos places, encaisser le paiement, émettre et contrôler vos billets (exécution du contrat).',
            'Protéger le service et vos billets : détecter la fraude, les doubles paiements et les accès non autorisés (intérêt légitime).',
            'Tenir notre comptabilité et répondre à nos obligations légales.',
            'Vous informer sur l’état d’une commande par SMS. Nous n’envoyons pas de publicité et ne vendons pas vos données.',
          ]}
        />
      </Section>

      <Section title="Qui reçoit vos données">
        <List
          items={[
            <><strong>La société de transport ou l’organisateur</strong> dont vous achetez un billet : votre nom, votre numéro de téléphone, votre siège et l’état de votre billet, pour préparer l’embarquement ou l’accès et contrôler le billet.</>,
            <><strong>GeniusPay</strong>, qui traite le paiement.</>,
            <><strong>Notre prestataire d’envoi de SMS</strong>, pour les messages ci-dessus.</>,
            <><strong>Notre hébergeur</strong> : <Value value={legal.hostName} />, données hébergées en <Value value={legal.hostingCountry} />.</>,
            'Les autorités compétentes, lorsque la loi nous y oblige.',
          ]}
        />
        <p>Les icônes de l’interface sont chargées depuis Google Fonts : votre adresse IP est alors transmise à Google. Les polices de texte sont servies par TicketHub CI.</p>
      </Section>

      <Section title="Combien de temps nous les gardons">
        <List
          items={[
            'Compte : tant qu’il est ouvert. Vous pouvez demander sa suppression à tout moment.',
            'Commandes, billets et données de paiement : 10 ans, durée de conservation des pièces comptables.',
            'Journaux de sécurité et d’audit : 12 mois.',
            'Session de connexion : 14 jours au plus, ou jusqu’à votre déconnexion.',
          ]}
        />
      </Section>

      <Section title="Cookies et stockage sur votre appareil">
        <List
          items={[
            <>Un cookie de session, <code>tickethub_session</code>, strictement nécessaire à la connexion. Il n’est lisible que par le serveur et ne sert à aucun suivi.</>,
            'Une copie de vos billets, enregistrée dans le navigateur pour que vous puissiez les présenter sans réseau. Elle est supprimée quand vous vous déconnectez ; ne la conservez pas sur un appareil partagé.',
          ]}
        />
        <p>Nous n’utilisons ni cookie publicitaire ni outil de mesure d’audience, c’est pourquoi aucun bandeau de consentement n’est affiché.</p>
      </Section>

      <Section title="Vos droits">
        <p>
          Conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel, vous pouvez demander
          l’accès à vos données, leur rectification, leur suppression, et vous opposer à certains traitements. Écrivez à{' '}
          <Value value={legal.dataProtectionEmail} />. Nous répondons dans un délai raisonnable, après avoir vérifié votre identité.
        </p>
        <p>
          Certaines données doivent être conservées malgré une demande de suppression (obligations comptables, preuve d’une transaction). Si vous
          estimez que vos droits ne sont pas respectés, vous pouvez saisir l’Autorité de régulation des télécommunications/TIC de Côte d’Ivoire (ARTCI).
        </p>
      </Section>

      <Section title="Comment nous protégeons vos données">
        <p>
          Les échanges sont chiffrés (HTTPS), les mots de passe ne sont jamais conservés en clair, l’accès des partenaires est limité à leur société et protégé par
          une double authentification, et les actions sensibles sont journalisées. Aucune protection n’est absolue : si une atteinte à vos données survenait,
          nous vous en informerions ainsi que l’autorité compétente.
        </p>
      </Section>

      <Section title="Modifications">
        <p>Si ce texte change de façon importante, la date de version ci-dessus change et nous vous le signalons à votre prochaine inscription ou connexion.</p>
      </Section>
    </LegalLayout>
  );
}
