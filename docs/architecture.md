# Architecture notes

## Workspace

`apps/frontend` and `apps/backend` are pnpm applications. `packages/types` contains cross-app contracts; `packages/shared` contains dependency-free common formatting and phone normalization. Frontend feature pages are in `apps/frontend/src/features`; the client uses React Router (`apps/frontend/src/app/router.tsx`) with code-split route modules in `src/routes`. Session state (`app/session.tsx`) and the in-memory checkout draft (`app/booking-flow.tsx`) are React contexts. Existing screens keep their `onNavigate(screen)` contract through `useScreenNavigation`, and `app/paths.ts` is the single map between URLs and screens. URLs: `/`, `/trajets/:id`, `/evenements/:id`, `/paiement`, `/paiement/retour`, `/billets`, `/billets/:code`, `/partenaire/*`.

The backend keeps HTTP controllers thin and routes business operations through module services/repositories. PostgreSQL is the source of truth. BullMQ is optional for development; persisted notifications and periodic jobs remain available without Redis.

## Booking and ticket invariants

- Transport reservations lock the trip row; event reservations lock the ticket-category row. Capacity, price and current holds are checked inside a serializable transaction.
- Reservation holds expire after ten minutes. A late payment is retained for manual review and does not issue a ticket.
- A booking has one payment/order. Checkout initialization persists an idempotency key before calling GeniusPay and returns an existing checkout on retry.
- A signed success webhook validates reference, amount and currency before marking the booking/order paid and issuing the requested number of tickets in the same transaction.
- QR payloads are HMAC-signed and expire. Scan consumption locks and updates one active ticket atomically.
- Refunds are requests for manual review only. No undocumented provider refund endpoint is called.

## API and frontend compatibility

The frontend calls relative `/api` URLs. Vite proxies these paths to port 3001 during local development. Authentication stays in an HTTP-only cookie; the client never stores bearer tokens. Keep the established response shapes when changing controllers because the current UI consumes them directly.

## PWA and offline behavior

`vite-plugin-pwa` precaches the app shell and caches Google font files. The service worker never stores `/api` responses. A new version is offered through a banner and applied only on consent, so it cannot interrupt a payment. The last loaded wallet is kept in IndexedDB so a ticket can be shown without network, and is deleted on logout. Purchases always require a connection. Browsers only run the service worker over HTTPS (or localhost).

