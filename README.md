# TicketHub CI

Application de réservation de trajets interurbains et de billets événementiels en Côte d’Ivoire. Le dépôt est organisé en workspace pnpm : client React/Vite, API Express modulaire, et packages partagés pour les types et utilitaires. L’API utilise PostgreSQL via Prisma 7 et son adapter `pg`; Redis/BullMQ exécute les tâches asynchrones lorsqu’il est configuré.

## Prérequis

- Node.js 20.19+ (ou 22.12+)
- pnpm 12 (Corepack peut l’activer à partir du champ `packageManager`)
- Docker Compose et PostgreSQL 14+; Redis est facultatif en développement
- Un compte marchand GeniusPay et des credentials sandbox pour tester un véritable checkout

## Démarrage local

```bash
corepack pnpm install
cp .env.example .env
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

Vite est disponible sur `http://localhost:3000` et relaie `/api` vers l’API sur `0.0.0.0:3001`. L’API répond au health check sur `/api/health`. Pour activer BullMQ en local, démarrer aussi `redis` avec Compose et renseigner `REDIS_URL=redis://127.0.0.1:6379` dans `.env`; sans Redis, expiration et rapprochement tournent via des tâches locales.

Le `.env.example` contient des secrets factices de développement uniquement. Les remplacer par des valeurs aléatoires indépendantes avant tout déploiement; ne jamais committer `.env` ou credentials.

## Workspace et organisation

- `apps/frontend` : client Vite; les écrans ont été rangés par fonction dans `src/features`, avec les frontières app, composants, layouts, routes, hooks, services et styles.
- `apps/backend` : API Express, migrations Prisma et tests unit/integration/e2e. `src/app.ts` crée l’application; `src/server.ts` connecte PostgreSQL/Redis, monte l’API et gère l’arrêt propre.
- `packages/types` : contrats de données partagés entre client et API.
- `packages/shared` : formatage XOF et normalisation du téléphone ivoirien.
- `docs` : notes d’architecture et d’exploitation.
- `docker-compose.yml` : services PostgreSQL et Redis pour le développement.

Les réponses HTTP utilisées par l’interface existante restent compatibles : `{ user }` pour l’authentification, `{ data }` pour le catalogue/réservations/billets, et la carte des sièges sans enveloppe. Le navigateur utilise uniquement des URL relatives (`/api`); Vite relaie les appels côté serveur.

## Base de données et migration legacy

Pour une base neuve, `db:migrate` applique les migrations de `apps/backend/prisma`. Pour une base déjà créée par l’ancien serveur SQL direct, faire une sauvegarde, puis baseliner une seule fois avant de déployer l’extension Prisma :

```bash
DATABASE_URL='postgresql://…/tickethub' corepack pnpm db:baseline:legacy
DATABASE_URL='postgresql://…/tickethub' corepack pnpm db:migrate
```

Le baseline suppose les tables legacy (`users`, `sessions`, `bus_trips`, `events`, `event_ticket_categories`, `bookings`, `payments`, `tickets`, `webhook_deliveries`). La migration suivante ajoute providers, commandes, remboursements, règlements, notifications et événements de sécurité, élargit les états de paiement et backfill les commandes depuis les réservations existantes. Ne lancez pas ce baseline sur une base vide.

`pnpm db:generate` produit le client Prisma sous `apps/backend/src/generated`; l’accès aux moteurs Prisma est nécessaire à la première génération. `pnpm db:seed` ajoute de façon idempotente les trajets des 14 prochains jours et les événements de démonstration.

## Configuration

| Variable | Usage |
| --- | --- |
| `DATABASE_URL` | URI PostgreSQL (obligatoire). |
| `API_PORT` | Port HTTP (3001 par défaut). |
| `APP_URL` | Origine du client utilisée dans les URL de retour GeniusPay. |
| `WEB_ORIGIN` | Origine navigateur autorisée et configuration des sessions. |
| `JWT_SECRET` | HMAC des sessions JWT (32 caractères minimum). |
| `TICKET_SIGNING_SECRET` | HMAC des QR de billets (32 caractères minimum). |
| `SESSION_TTL_DAYS` | Durée de session (14 jours par défaut). |
| `REDIS_URL` | Redis/BullMQ; facultatif en local, obligatoire en production. |
| `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET` | Credentials serveur-à-serveur GeniusPay; jamais exposés au navigateur. |
| `GENIUSPAY_WEBHOOK_SECRET` | Secret configuré pour signer les webhooks du marchand. |
| `GENIUSPAY_API_BASE_URL` | Base de l’API GeniusPay. |
| `PARTNER_INVITE_CODE` | Code d’invitation optionnel pour l’inscription partenaire. |
| `PGSSL`, `PG_POOL_SIZE` | TLS et taille du pool PostgreSQL. |
| `PLATFORM_COMMISSION_BPS` | Commission des règlements en points de base (0 par défaut). |
| `EMAIL_PROVIDER_URL`, `EMAIL_PROVIDER_API_KEY` | Adapter HTTP optionnel pour les emails sortants. |
| `SMS_PROVIDER_URL`, `SMS_PROVIDER_API_KEY` | Adapter HTTP optionnel pour les SMS sortants. |

En production, l’API exige HTTPS pour `APP_URL`/`WEB_ORIGIN`, Redis et les credentials GeniusPay. Les secrets doivent venir du gestionnaire de secrets de l’environnement de déploiement.

## Architecture backend

- `apps/backend/src/config` : validation stricte de l’environnement, Prisma/PostgreSQL, Redis et configuration HTTP.
- `apps/backend/src/core` et `middleware` : erreurs, logging, pagination, sécurité, authentification, permissions et validation Zod.
- `apps/backend/src/modules` : auth, users, providers, catalogue, trips, events, réservations, commandes, paiements, billets, remboursements, settlements, notifications et sécurité.
- `apps/backend/src/integrations` : adapter GeniusPay et providers email/SMS HTTP.
- `apps/backend/src/queues` et `jobs` : BullMQ, expiration des réservations/commandes, rapprochement des paiements, notifications, revue des remboursements et génération des règlements.
- `apps/backend/prisma` : schéma, migrations SQL et seed.

Les holds durent 10 minutes. Disponibilité, prix et capacité sont vérifiés dans une transaction PostgreSQL verrouillée. Un paiement confirmé après expiration passe en `needs_review` au lieu d’émettre automatiquement un billet. Les remboursements sont soumis à une revue manuelle : aucun appel de retour d’argent GeniusPay non documenté n’est effectué. Le rapprochement marque pour contrôle les paiements anciens sans endpoint fournisseur supposé.

## GeniusPay, QR et partenaire

Configurer l’URL publique `https://<origine-api>/api/webhooks/geniuspay`. Le routeur webhook lit le corps JSON brut avant `express.json`, vérifie `X-Webhook-Signature` et `X-Webhook-Timestamp` (HMAC-SHA256 de `timestamp + "." + payload`, fenêtre de cinq minutes) et déduplique l’identifiant signé de l’événement. Un billet est émis uniquement après un webhook de succès correspondant à la réservation, à la référence, au montant et à la devise XOF; la redirection du navigateur ne confirme jamais le paiement.

Les QR sont liés à un billet et à une réservation, signés HMAC et expirables. Le scanner partenaire consomme le billet atomiquement; un deuxième scan est refusé. Le manifeste partenaire expose les billets payés d’un trajet. Wave, Orange Money, MTN, Moov et carte sont mappés par l’adapter; les méthodes effectivement disponibles dépendent du compte marchand. Les paiements réels ne peuvent être testés sans credentials et webhook public; l’e2e utilise un faux provider HTTP.

## Vérification

```bash
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

Les tests unitaires couvrent les schémas, permissions, mappings, validateurs métier et signatures historiques. Les suites PostgreSQL s’exécutent sur une base jetable migrée et seedée :

```bash
export TEST_DATABASE_URL='postgresql://…/tickethub_test'
export DATABASE_URL="$TEST_DATABASE_URL"
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm test:integration
corepack pnpm test:e2e
```

Les tests d’intégration/e2e sont ignorés si `TEST_DATABASE_URL` est absent. Aucun paiement réel n’est effectué par la suite e2e.
