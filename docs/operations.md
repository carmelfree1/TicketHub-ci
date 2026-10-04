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

## Payments: reconciliation, refunds, notifications and payouts

What the gateway documents (checked on pay.genius.ci/doc): webhooks signed with `X-Webhook-Signature`/`X-Webhook-Timestamp`, the events `payment.success`, `payment.failed`, `payment.cancelled`, `payment.expired`, `payment.refunded` and `cashout.*`, and `GET /payments/{reference}` returning `pending`, `processing`, `completed`, `failed` or `expired`. It documents **no endpoint to create a refund and none to pay out a company**; both stay manual.

- **Lost webhooks.** Every 2 minutes a job asks the gateway (`GET /payments/{reference}`) about payments still pending after 2 minutes and applies the answer with the same code path as the webhook, so the two can be combined safely and replays change nothing. A completed answer is applied only if reference, amount (XOF) and currency match the booking. A payment still unresolved 45 minutes after creation goes to manual review and the customer is told. If the hold had already expired when the money arrived, no ticket is issued: the payment goes to manual review.
- **Refunds.** A refund is made by a person in the gateway's dashboard. When the gateway then sends `payment.refunded` for the full amount, the payment and order become `refunded`, the refund record `completed`, unused tickets are cancelled (a refunded ticket no longer opens doors; used tickets stay as proof of entry) and the customer is notified. A partial refund event is journaled and raises a high severity `payment.partial_refund_received` security event for a person to handle; nothing is cancelled automatically. A refund larger than the payment, or in another currency, is rejected.
- **Review queue.** `pnpm --filter @tickethub/backend exec tsx scripts/review-queue.ts` lists payments waiting for a decision and open refund requests. Run it daily until an admin screen exists, and alert on `needs_review` payments.
- **Notifications.** Payment confirmed, payment failed, payment under review and refund completed create an SMS in the same transaction as the change, then are delivered right after the commit (queue when Redis is configured, directly otherwise). A failed delivery is kept and retried every minute, five attempts maximum. Messages carry a short booking reference and never a ticket code, QR token or link. Configure `SMS_PROVIDER_URL` and `SMS_PROVIDER_API_KEY`; the adapter posts `{ to, template, payload: { message, bookingId } }` as JSON with a bearer key, so a gateway-specific adapter may be needed. Email is not used by any flow yet.
- **Scheduled jobs and several instances.** Each job takes a PostgreSQL advisory lock for its name, so only one API instance runs it at a time and provider calls are not multiplied.
- **Company payouts.** Daily settlements are generated automatically for the previous UTC day. The transfer is made by a person; record it with `tsx scripts/settlements.ts list|generate|approve|paid <id> <transfer reference>|cancel <id>`. Lifecycle: `pending` (recomputed on each run) to `approved` to `paid`; a paid settlement is final, and the database refuses any other combination. Refunds issued after a settlement was approved are not netted automatically: adjust the next transfer by hand.
- **Suspended companies.** Their departures and events disappear from the catalog and cannot be booked. Existing tickets keep working and are settled normally.

## Pre-production notes

- **Redis connection.** The API creates its queues while modules load and connects afterwards; `connectRedis()` now waits for the already started connection instead of connecting twice (that crashed every production start). `test/integration/redis.integration.test.ts` covers it and runs in CI against a Redis service (`TEST_REDIS_URL`).
- **Failed messages.** The retry job now works through the whole backlog in batches (up to 500 per run) so old failures cannot hide newer messages.
- **API rate limit.** `API_RATE_LIMIT_MAX` (default 600 per minute per address) is deliberately generous because many customers share one address behind a mobile carrier. nginx adds its own limits on login and the API.
- **Legal identity and release builds.** See `docs/go-live.md`.

