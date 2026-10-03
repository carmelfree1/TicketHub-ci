# TicketHub CI

Application de réservation de trajets interurbains et de billets événementiels en Côte d’Ivoire. Le client React/Vite communique avec une API Express et PostgreSQL. Les réservations, paiements, billets et validations QR sont conservés et vérifiés côté serveur.

## Prérequis

- Node.js 20.19+ (ou 22.12+)
- PostgreSQL 14+
- Un compte marchand GeniusPay avec ses credentials pour lancer de vrais paiements

## Démarrage local

1. Installer les dépendances :

   ```bash
   npm install
   ```

2. Créer la base PostgreSQL et copier la configuration :

   ```bash
   createdb tickethub
   cp .env.example .env
   ```

   Adapter `DATABASE_URL` dans `.env`. `server/index.ts` crée le schéma puis insère le catalogue de démonstration (trajets pour les 14 prochains jours et événements futurs) de façon idempotente au démarrage.

3. Générer les secrets indépendants :

   ```bash
   openssl rand -base64 48
   ```

   Utiliser des valeurs différentes pour `TICKET_SIGNING_SECRET`, `GENIUSPAY_WEBHOOK_SECRET` et `PARTNER_INVITE_CODE`. En production, les deux secrets de paiement, la clé API GeniusPay et le secret de signature des billets doivent être définis; l’API refuse de démarrer si l’un manque ou fait moins de 32 caractères.

4. Lancer l’API et Vite :

   ```bash
   npm run dev
   ```

   Le client est disponible sur `http://localhost:3000`, l’API sur `http://localhost:3001`. Vite relaie `/api` vers l’API. Une base PostgreSQL est nécessaire pour utiliser les comptes, réservations, billets et scans persistants.

## Configuration

| Variable | Usage |
| --- | --- |
| `DATABASE_URL` | URI PostgreSQL de l’application. |
| `API_PORT` | Port HTTP de l’API (3001 par défaut). |
| `APP_URL` | Origine publique du client; GeniusPay y redirige le navigateur après le checkout. En production, renseigner l’URL HTTPS réellement déployée. |
| `WEB_ORIGIN` | Origine du client autorisée pour les requêtes mutantes en production. |
| `TICKET_SIGNING_SECRET` | Secret privé HMAC pour signer les QR à usage unique (32 caractères minimum). |
| `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET` | Credentials serveur-à-serveur GeniusPay; ne jamais les préfixer par `VITE_` ni les exposer au navigateur. |
| `GENIUSPAY_WEBHOOK_SECRET` | Secret configuré pour signer les webhooks du marchand. |
| `GENIUSPAY_API_BASE_URL` | Base API GeniusPay; défaut `https://pay.genius.ci/api/v1/merchant`. |
| `PARTNER_INVITE_CODE` | Code d’invitation; sans code valide, les nouvelles inscriptions restent voyageur. |
| `PGSSL` | Mettre `true` si PostgreSQL exige TLS avec certificat vérifié. |
| `PG_POOL_SIZE` | Taille maximale du pool PostgreSQL (10 par défaut). |

Les réservations transport et événement ont un hold de 10 minutes. Leur tarif, capacité et disponibilité sont recalculés et verrouillés dans une transaction PostgreSQL au moment de la réservation. Les sièges/capacités sont libérés à l’expiration. Un paiement reçu tardivement est placé en `needs_review`, sans émission automatique de billet.

## GeniusPay et webhooks

Le serveur initie le checkout avec `POST /api/v1/merchant/payments`; les méthodes Wave, Orange Money, MTN MoMo et carte sont transmises au fournisseur. Moov laisse le checkout présenter les moyens effectivement activés sur le compte marchand.

Configurer dans le tableau de bord marchand l’URL publique :

```text
https://<origine-api>/api/webhooks/geniuspay
```

Le point d’entrée vérifie `X-Webhook-Signature` et `X-Webhook-Timestamp` sur le corps JSON brut (HMAC-SHA256 de `timestamp + "." + payload`), avec une fenêtre de fraîcheur de cinq minutes. Les livraisons sont idempotentes. Un billet n’est émis qu’après webhook de succès signé, correspondant à la référence, au montant et à la devise XOF de la réservation. Une simple redirection du navigateur ne confirme jamais le paiement.

Les transactions réelles ne peuvent pas être testées sans les credentials marchand et un webhook public accessible. Garder les clés sandbox séparées des clés de production.

## Billets et contrôles

- Les QR contiennent un jeton HMAC signé, lié au ticket et à la réservation, avec une expiration.
- `POST /api/partner/scans` exige une session partenaire. Le contrôle consomme le billet avec une mise à jour atomique; un deuxième scan, un billet expiré ou non payé est refusé.
- Le scanner utilise la caméra avec `BarcodeDetector` si le navigateur le prend en charge. L’accès caméra nécessite HTTPS (ou localhost); la saisie manuelle du code reste disponible en secours.
- Le wallet charge les billets persistés de la session. Il ne fabrique pas de pass localement.

## Routes API principales

- Authentification : `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- Catalogue : `/api/catalog/trips`, `/api/catalog/trips/:tripId/seats`, `/api/catalog/events`.
- Réservation et paiement : `/api/bookings/transport`, `/api/bookings/event`, `/api/bookings/:bookingId`, `/api/bookings/:bookingId/payment`.
- Billets et partenaire : `/api/tickets`, `/api/partner/scans`, `/api/partner/manifest/:tripId`.
- Webhook : `/api/webhooks/geniuspay`.

## Vérification

```bash
npm test
npm run lint
npm run build
```

Les tests actuels couvrent les validateurs métier, les formats de téléphone et de billet, les signatures QR et la fraîcheur/signature des webhooks. Les scénarios bout en bout qui appellent PostgreSQL ou GeniusPay nécessitent une base et des credentials configurés.
