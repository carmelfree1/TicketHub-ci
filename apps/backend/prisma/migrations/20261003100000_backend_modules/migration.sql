-- The initial application used these core tables before Prisma Migrate was introduced.
-- CREATE IF NOT EXISTS keeps this migration safe after baselining a legacy database.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'refunded', 'needs_review'));

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'failed', 'expired', 'needs_review', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);

-- Preserve legacy booking history in the new orders module after a Prisma baseline.
INSERT INTO orders (id, booking_id, user_id, amount_xof, currency, status, created_at)
SELECT
  'legacy-order-' || b.id,
  b.id,
  b.user_id,
  b.amount_xof,
  b.currency,
  CASE
    WHEN b.status = 'pending_payment' AND b.hold_expires_at <= NOW() THEN 'expired'
    WHEN b.status IN ('pending_payment', 'paid', 'failed', 'expired', 'needs_review', 'cancelled') THEN b.status
    ELSE 'needs_review'
  END,
  b.created_at
FROM bookings b
ON CONFLICT (booking_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  reason VARCHAR(1000) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'reviewing', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  provider_ref VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refunds_status_created_idx ON refunds(status, created_at);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  provider_code VARCHAR(40) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  gross_xof INTEGER NOT NULL,
  commission_xof INTEGER NOT NULL,
  net_xof INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_code, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS settlements_provider_period_idx ON settlements(provider_code, period_start);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  template VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_status_created_idx ON notifications(status, created_at);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  ip_address VARCHAR(64),
  user_agent VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS security_events_type_created_idx ON security_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS security_events_user_created_idx ON security_events(user_id, created_at);
