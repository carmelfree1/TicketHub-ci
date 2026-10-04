# Going live

This list separates what the code already enforces from what only the business owner can provide. Nothing below can be
filled in by the developers: it depends on contracts, legal identity and decisions.

## 1. Things only you can supply

| Item | Where it goes | Why it blocks |
| --- | --- | --- |
| Domain name and TLS certificate | `APP_URL`, `WEB_ORIGIN`, `VITE_SITE_URL` (all `https://`) | Cookies are `Secure` in production, the service worker and camera scanner need HTTPS, and the API refuses http addresses. |
| Legal identity of the operating company | `VITE_LEGAL_*` (see `deploy/.env.production.example`) | A release build (`RELEASE_BUILD=1`, set by `deploy/Dockerfile.web`) fails while any required field is empty, so the legal notice cannot go out blank. |
| Review of the legal texts by a lawyer | `apps/frontend/src/legal/*.tsx` | The terms, privacy policy and legal notice are drafts written from what the system actually does. Refund rules, retention periods and the court clause are business decisions. Raise `TERMS_VERSION` in `packages/shared/src/index.ts` whenever a text changes in substance. |
| ARTCI formalities | `VITE_LEGAL_ARTCI_REFERENCE` | Processing personal data in Cote d'Ivoire may require a declaration or authorization; confirm with your adviser. |
| GeniusPay live credentials | `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET`, `GENIUSPAY_WEBHOOK_SECRET` | Production refuses sandbox or mock keys. Register `https://<domain>/api/webhooks/geniuspay` as the webhook URL. |
| SMS provider | `SMS_PROVIDER_URL`, `SMS_PROVIDER_API_KEY` | Confirmations are written and retried but cannot be delivered without one. The adapter posts `{ to, template, payload }`; a provider-specific adapter may be needed. |
| Managed PostgreSQL and Redis with backups | `DATABASE_URL`, `REDIS_URL`, `PGSSL` | Redis is mandatory in production (queues, shared state). Test a restore before launch. |
| Monitoring and alerting | your platform | Alert on 5xx rates, failing health checks, `needs_review` payments (`scripts/review-queue.ts`) and `security_events` of high or critical severity. |
| Decision on retention | `docs/operations.md` | The policy page promises 10 years for orders, 12 months for logs; schedule the purge. |

## 2. First-day operations (no admin screen exists yet)

1. Create the companies (`providers`), then issue one invitation per partner account:
   `pnpm --filter @tickethub/backend exec tsx scripts/create-provider-invite.ts <CODE> <owner|manager|scanner> 7`.
2. Reassign events that migration `20261005000000` attached to the suspended placeholder `EVENTS-UNASSIGNED`.
3. Insert the commission rules you agreed with each company (`commission_rules`); without any, `PLATFORM_COMMISSION_BPS` applies.
4. Ask every partner to enable two-factor authentication; scanning and manifests are blocked until they do.
5. Run the review queue every day, and settle companies with `scripts/settlements.ts` (a person makes the transfer).

## 3. Deploying

```bash
cp deploy/.env.production.example .env.production        # fill in every value
docker compose -f deploy/docker-compose.prod.example.yml --env-file .env.production build
docker compose -f deploy/docker-compose.prod.example.yml --env-file .env.production run --rm api ./node_modules/.bin/prisma migrate deploy
docker compose -f deploy/docker-compose.prod.example.yml --env-file .env.production up -d
```

Back up the database before migrating an existing installation, and read the notes in `docs/operations.md` about
migration `20261005000000` (companies, ownership, order snapshots) and `20261006000000` (settlement lifecycle).

## 4. What the code enforces

- The API refuses to start in production with: sandbox or mock payment keys, secrets that look like examples, equal session and
  ticket secrets, the development database credentials, no Redis, no encryption key, or non-https addresses.
- The web image cannot be built without the legal identity and a valid https site address.
- nginx sends a strict CSP, HSTS, frame denial and cache rules (immutable hashed assets, revalidated shell and service worker),
  rate limits login and the API, and shows a branded page when the API is down.
- `robots.txt` hides private areas; `sitemap.xml` lists only public pages; private pages carry `noindex`.
- Accounts record which version of the terms was accepted and when.

## 5. Checked on this codebase

| Check | Result |
| --- | --- |
| Type check, lint, unit, integration and end-to-end tests | pass (see CI) |
| Dependency audit (`pnpm audit`) | no known vulnerabilities (two transitive packages of the Prisma CLI are pinned by `overrides`) |
| Automated accessibility audit (axe, WCAG 2.1 A/AA) of the catalog, sign-in and sign-up dialogs, seat selection, tickets, legal pages, 404, partner home, manifest and scanner | no violations after fixing text contrast and headings |
| Production CSP in a real browser against the nginx image | no violations (icon font needs `data:` fonts, allowed) |
| Concurrency: 100 buyers on one seat, random seats, event stock, catalog reads under write load | never oversold or double booked; contested-seat p95 about 2 s on a laptop |
| Web image build, nginx configuration test, routing, headers, caching | pass |
| API image built and started with `NODE_ENV=production` against PostgreSQL and Redis: connects to both, answers `/api/health`, runs as the non-root `node` user, sends HSTS; refuses to start with the development database credentials | pass (this run found and fixed a crash at start-up whenever Redis was configured; a regression test now covers it) |

## 6. Not verified

- **Service worker and installability** were not exercised: the available browser does not register service workers. Test in Chrome
  over HTTPS (Application panel, offline mode, "Install app").
- **Lighthouse / Core Web Vitals** were not measured. Bundle sizes are small (main script about 280 KB, 90 KB compressed; text fonts
  self-hosted; icon font limited to the icons used) but real-device timings on a 3G connection are unknown.
- **Compose stack as a whole** (`deploy/docker-compose.prod.example.yml`): each image was built and started on its own; the combined file was not run. Check it on your target host.
- **GeniusPay in a real sandbox**: payments, webhooks and status lookups were tested against a simulated gateway that follows its
  documentation. Run the full flow once with sandbox keys before switching to live keys.
- **Payment, digital pass and event selection screens** were not part of the browser accessibility run (they need a live booking).
- **Load tests** ran on one machine; they prove the invariants, not capacity. Size the database pool (`PG_POOL_SIZE`) and instances
  from a test on production-like hardware.
- **Search indexing**: the site is a single page app, so crawlers must run JavaScript. Public pages have titles, descriptions and
  canonical addresses, but there is no server rendering.
