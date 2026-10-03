# Architecture notes

## Workspace

`apps/frontend` and `apps/backend` are pnpm applications. `packages/types` contains cross-app contracts; `packages/shared` contains dependency-free common formatting and phone normalization. Frontend feature pages are in `apps/frontend/src/features`; the current client still coordinates its screens through a single `AppScreen` state machine so existing navigation and checkout behavior remain unchanged.

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
