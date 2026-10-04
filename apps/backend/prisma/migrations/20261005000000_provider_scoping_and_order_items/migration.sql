-- Provider membership, invitations, per-provider catalog ownership, sale snapshots, commission rules,
-- payment journal and integrity constraints.

CREATE TABLE provider_members (
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'scanner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, user_id)
);
CREATE INDEX provider_members_user_id_idx ON provider_members(user_id);

CREATE TABLE provider_invites (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'scanner')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX provider_invites_provider_id_idx ON provider_invites(provider_id);

-- Catalog ownership. Trips were linked to a provider only by carrier_code, events by nothing.
INSERT INTO providers (id, name, code, status)
SELECT 'provider-' || lower(carrier_code), MIN(carrier), carrier_code, 'active'
FROM bus_trips
GROUP BY carrier_code
ON CONFLICT (code) DO NOTHING;

ALTER TABLE bus_trips ADD COLUMN provider_id TEXT REFERENCES providers(id);
UPDATE bus_trips t SET provider_id = p.id FROM providers p WHERE p.code = t.carrier_code;
ALTER TABLE bus_trips ALTER COLUMN provider_id SET NOT NULL;
CREATE INDEX bus_trips_provider_id_depart_at_idx ON bus_trips(provider_id, depart_at);

-- Events created before ownership existed cannot be attributed to a real organizer. They go to a suspended
-- placeholder so nobody can scan or settle them by accident; an operator must reassign them.
INSERT INTO providers (id, name, code, status)
VALUES ('provider-events-unassigned', 'Organisateur non attribué', 'EVENTS-UNASSIGNED', 'suspended')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE events ADD COLUMN provider_id TEXT REFERENCES providers(id);
UPDATE events SET provider_id = (SELECT id FROM providers WHERE code = 'EVENTS-UNASSIGNED') WHERE provider_id IS NULL;
ALTER TABLE events ALTER COLUMN provider_id SET NOT NULL;
CREATE INDEX events_provider_id_starts_at_idx ON events(provider_id, starts_at);

CREATE TABLE commission_rules (
  id TEXT PRIMARY KEY,
  provider_id TEXT REFERENCES providers(id) ON DELETE CASCADE,
  product_type VARCHAR(20) CHECK (product_type IN ('transport', 'event')),
  rate_bps INTEGER NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  min_xof INTEGER CHECK (min_xof >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX commission_rules_lookup_idx ON commission_rules(active, provider_id, product_type);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('transport', 'event')),
  bus_trip_id TEXT REFERENCES bus_trips(id),
  event_id TEXT REFERENCES events(id),
  ticket_category_id TEXT REFERENCES event_ticket_categories(id),
  description VARCHAR(300) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price_xof INTEGER NOT NULL CHECK (unit_price_xof >= 0),
  line_total_xof INTEGER NOT NULL CHECK (line_total_xof >= 0),
  commission_bps INTEGER NOT NULL CHECK (commission_bps BETWEEN 0 AND 10000),
  commission_xof INTEGER NOT NULL CHECK (commission_xof >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_line_total_check CHECK (line_total_xof = quantity * unit_price_xof),
  CONSTRAINT order_items_commission_check CHECK (commission_xof <= line_total_xof)
);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_provider_id_created_at_idx ON order_items(provider_id, created_at);

-- Paid orders created before snapshots existed. Commission is unknown for them, so it is recorded as zero.
INSERT INTO order_items (id, order_id, provider_id, product_type, bus_trip_id, event_id, ticket_category_id, description,
                         quantity, unit_price_xof, line_total_xof, commission_bps, commission_xof, created_at)
SELECT 'legacy-item-' || o.id, o.id,
       COALESCE(t.provider_id, e.provider_id), b.product_type, b.bus_trip_id, b.event_id, b.ticket_category_id,
       LEFT(COALESCE(t.carrier || ' ' || t.depart_city || ' - ' || t.arrival_city, e.title, 'Commande'), 300),
       b.quantity, b.amount_xof / b.quantity, b.amount_xof, 0, 0, o.created_at
FROM orders o
JOIN bookings b ON b.id = o.booking_id
LEFT JOIN bus_trips t ON t.id = b.bus_trip_id
LEFT JOIN events e ON e.id = b.event_id
WHERE o.status IN ('paid', 'refunded')
  AND COALESCE(t.provider_id, e.provider_id) IS NOT NULL
  AND b.quantity >= 1
  AND b.amount_xof = (b.amount_xof / b.quantity) * b.quantity;

CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL,
  provider_event_id VARCHAR(200) UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  amount_xof INTEGER,
  currency VARCHAR(3),
  status VARCHAR(30),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX payment_transactions_payment_id_created_at_idx ON payment_transactions(payment_id, created_at);

-- Quantity, amount, price and capacity checks already exist on bookings, payments, orders, trips and ticket
-- categories (see the initial migration). Settlements had none: net must always equal gross minus commission.
ALTER TABLE settlements ADD CONSTRAINT settlements_amounts_check
  CHECK (gross_xof >= 0 AND commission_xof >= 0 AND commission_xof <= gross_xof AND net_xof = gross_xof - commission_xof);
