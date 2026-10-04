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

## Companies, partner accounts and commissions

- **Ownership.** Every departure (`bus_trips.provider_id`) and event (`events.provider_id`) belongs to a company (`providers`). A partner account acts only for the companies it is a member of (`provider_members`, roles `owner`, `manager`, `scanner`). Scanning, manifests, departure lists, statistics and settlements are all filtered by that membership on the server. A scan for another company's ticket answers `403 WRONG_PROVIDER`, leaves the ticket untouched and raises a high severity `ticket.wrong_provider_scan` security event. A partner account that belongs to no company answers `403 NO_PROVIDER` everywhere.
- **Creating a partner account.** There is no shared partner password or code. Issue a single-use invitation for one company and give the printed code to the person: `pnpm --filter @tickethub/backend exec tsx scripts/create-provider-invite.ts <PROVIDER_CODE> <owner|manager|scanner> <days>`. Only a hash is stored; the code expires, works once, and is refused if the company is suspended. A wrong code on the registration form is an error, never a silent traveler sign-up. For local development, `scripts/create-test-partner.ts` links a throwaway account to the seeded UTB company and refuses to run in production.
- **Migrating existing data.** Migration `20261005000000` creates one company per distinct `carrier_code` found on trips, attaches existing events to the suspended placeholder company `EVENTS-UNASSIGNED` (reassign them with SQL before going live; nobody can scan or settle them meanwhile) and backfills a sale snapshot for already paid orders with a commission of zero because the historical rate is unknown. Back up and review the result before deploying.
- **Sale snapshots.** When an order is paid, `order_items` records the company, quantity, unit price, total and the commission rate and amount in force at that moment. Later changes to catalog or commission rules never rewrite past sales.
- **Commission rules.** `commission_rules` rows apply in this order of precedence: company and product type, company, product type, platform wide; the newest wins a tie; a rule may set a minimum; the commission never exceeds the amount paid. With no rule, `PLATFORM_COMMISSION_BPS` applies. There is no screen to edit rules yet; insert rows with SQL.
- **Settlements.** `SettlementService.generate(start, end)` totals the snapshots of paid orders per company, transport and events together. A pending settlement is recomputed on each run; an approved or paid one is never changed. Nothing schedules it yet and refunds are not netted out (see the remaining work in the project plan).
- **Payment journal.** `payment_transactions` keeps the checkout creation and the exact payload of every processed webhook, one row per provider event id. It may contain customer data; define its retention.

