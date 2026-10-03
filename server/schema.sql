CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'traveler' CHECK (role IN ('traveler', 'partner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS bus_trips (
  id TEXT PRIMARY KEY,
  carrier TEXT NOT NULL,
  carrier_code TEXT NOT NULL,
  service_title TEXT NOT NULL,
  depart_at TIMESTAMPTZ NOT NULL,
  depart_station TEXT NOT NULL,
  depart_city TEXT NOT NULL,
  arrival_station TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  duration TEXT NOT NULL,
  price_xof INTEGER NOT NULL CHECK (price_xof >= 0),
  seat_capacity INTEGER NOT NULL CHECK (seat_capacity > 0),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicle TEXT NOT NULL,
  registration TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bus_trips_departure_idx ON bus_trips(depart_at);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_start_idx ON events(starts_at);

CREATE TABLE IF NOT EXISTS event_ticket_categories (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_xof INTEGER NOT NULL CHECK (price_xof >= 0),
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  UNIQUE(event_id, name)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('transport', 'event')),
  bus_trip_id TEXT REFERENCES bus_trips(id),
  event_id TEXT REFERENCES events(id),
  ticket_category_id TEXT REFERENCES event_ticket_categories(id),
  seats INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  currency TEXT NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'failed', 'cancelled', 'expired', 'needs_review')),
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
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  provider TEXT NOT NULL DEFAULT 'geniuspay',
  provider_reference TEXT UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  checkout_url TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'refunded')),
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, ordinal)
);
CREATE INDEX IF NOT EXISTS tickets_booking_idx ON tickets(booking_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
