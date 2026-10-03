CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'traveler' CHECK (role IN ('traveler', 'partner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bus_trips (
  id TEXT PRIMARY KEY,
  carrier VARCHAR(160) NOT NULL,
  carrier_code VARCHAR(40) NOT NULL,
  service_title VARCHAR(160) NOT NULL,
  depart_at TIMESTAMPTZ NOT NULL,
  depart_station VARCHAR(160) NOT NULL,
  depart_city VARCHAR(100) NOT NULL,
  arrival_station VARCHAR(160) NOT NULL,
  arrival_city VARCHAR(100) NOT NULL,
  arrival_time VARCHAR(8) NOT NULL,
  duration VARCHAR(40) NOT NULL,
  price_xof INTEGER NOT NULL CHECK (price_xof >= 0),
  seat_capacity INTEGER NOT NULL CHECK (seat_capacity > 0),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicle VARCHAR(120) NOT NULL,
  registration VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bus_trips_departure_idx ON bus_trips(depart_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  venue VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_start_idx ON events(starts_at);

CREATE TABLE IF NOT EXISTS event_ticket_categories (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_xof INTEGER NOT NULL CHECK (price_xof >= 0),
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  UNIQUE(event_id, name)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('transport', 'event')),
  bus_trip_id TEXT REFERENCES bus_trips(id),
  event_id TEXT REFERENCES events(id),
  ticket_category_id TEXT REFERENCES event_ticket_categories(id),
  seats INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'failed', 'cancelled', 'expired', 'needs_review')),
  hold_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (product_type = 'transport' AND bus_trip_id IS NOT NULL AND event_id IS NULL AND ticket_category_id IS NULL)
    OR
    (product_type = 'event' AND bus_trip_id IS NULL AND event_id IS NOT NULL AND ticket_category_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_trip_idx ON bookings(bus_trip_id, status, hold_expires_at);
CREATE INDEX IF NOT EXISTS bookings_event_idx ON bookings(ticket_category_id, status, hold_expires_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'geniuspay',
  provider_reference VARCHAR(160) UNIQUE,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  checkout_url TEXT,
  payment_method VARCHAR(40),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'refunded', 'needs_review')),
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep this initial migration compatible with the SQL schema used by earlier deployments.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'refunded', 'needs_review'));

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'failed', 'expired', 'needs_review', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  reason VARCHAR(1000) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reviewing', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  provider_ref VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refunds_status_created_idx ON refunds(status, created_at);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, ordinal)
);
CREATE INDEX IF NOT EXISTS tickets_booking_idx ON tickets(booking_id);

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

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id VARCHAR(200) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
