# Operations

## Local services

Copy `.env.example` to `.env`, then use `docker compose up -d postgres` (and `redis` if desired). Default Compose credentials are development-only. Generate Prisma once with `pnpm db:generate`, apply migrations with `pnpm db:migrate`, and seed the demo catalog with `pnpm db:seed`.

## Existing SQL deployment

Take a database backup first. On a database initialized by the previous direct-SQL server, run `pnpm db:baseline:legacy` once, then `pnpm db:migrate`. The baseline is not for an empty database. Review new migrations before production rollout and retain a tested restore plan.

## Production requirements

Set `NODE_ENV=production`, HTTPS `APP_URL` and `WEB_ORIGIN`, PostgreSQL, Redis, independent 32-character-or-stronger JWT/ticket secrets, and GeniusPay server/webhook credentials through a secret manager. Route the public GeniusPay webhook to `/api/webhooks/geniuspay`. Monitor 5xx logs, Redis worker failures, expired holds, and `needs_review` payments. Do not mark a payment paid based on browser redirect alone.

Real payments, provider email/SMS delivery, and automatic refunds require provider credentials/contracts and are not covered by the local mocked e2e flow.
