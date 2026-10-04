# Operations

## Local services

Copy `.env.example` to `.env`, then use `docker compose up -d postgres` (and `redis` if desired). Default Compose credentials are development-only. Generate Prisma once with `pnpm db:generate`, apply migrations with `pnpm db:migrate`, and seed the demo catalog with `pnpm db:seed`.

## Existing SQL deployment

Take a database backup first. On a database initialized by the previous direct-SQL server, run `pnpm db:baseline:legacy` once, then `pnpm db:migrate`. The baseline is not for an empty database. Review new migrations before production rollout and retain a tested restore plan.

## Production requirements

Set `NODE_ENV=production`, HTTPS `APP_URL` and `WEB_ORIGIN`, PostgreSQL, Redis, independent 32-character-or-stronger JWT/ticket secrets, and GeniusPay server/webhook credentials through a secret manager. Route the public GeniusPay webhook to `/api/webhooks/geniuspay`. Monitor 5xx logs, Redis worker failures, expired holds, and `needs_review` payments. Do not mark a payment paid based on browser redirect alone.

Real payments, provider email/SMS delivery, and automatic refunds require provider credentials/contracts and are not covered by the local mocked e2e flow.

## Account security

- **MFA.** Accounts can enable TOTP (RFC 6238) from the account dialog. Secrets are stored encrypted with `DATA_ENCRYPTION_KEY` (AES-256-GCM); backup codes are stored as SHA-256 hashes and work once. A used time step is never accepted again. Roles in `MFA_REQUIRED_ROLES` (default `partner` in production) receive `403 MFA_SETUP_REQUIRED` on privileged routes until they enrol, and cannot disable MFA. Losing both the device and the backup codes requires an operator to reset the user's `mfa_*` columns after verifying identity out of band.
- **Lockout.** Five consecutive wrong passwords or second-factor codes lock the account for 15 minutes (`429 ACCOUNT_LOCKED`) and create an `auth.account_locked` security event. Unknown phone numbers receive the same response as a wrong password.
- **Audit trail.** `audit_logs` records registration, login (with MFA flag), logout, MFA changes, bookings, payment starts, processed webhooks, scans, rejected scans, manifest views and refund requests with user, IP and user agent. `security_events` records locked accounts, logins on locked accounts, and forged or inconsistent webhooks (`metadata.severity`). Both are best effort: a failed write is logged and never blocks the operation. Define a retention policy before launch.
- **Rate limits.** Login, MFA, reservation, payment, scan and webhook endpoints have their own budgets (see the README table). Counters live in process memory; run them against a shared Redis store before scaling beyond one API instance.
- **Headers.** The API sends a deny-all CSP, `frame-ancestors 'none'`, HSTS in production and `Cache-Control: no-store` outside the public catalog. The static frontend needs its own CSP at the hosting layer; the API's does not apply to it.

