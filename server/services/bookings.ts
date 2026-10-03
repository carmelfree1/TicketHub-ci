import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { DomainError, validateQuantity, validateSeats } from '../domain.js';

const HOLD_MINUTES = 10;

async function expireOldHolds(client: PoolClient, productIdColumn: 'bus_trip_id' | 'ticket_category_id', productId: string) {
  await client.query(
    `UPDATE bookings
     SET status = 'expired'
     WHERE ${productIdColumn} = $1
       AND status = 'pending_payment'
       AND hold_expires_at <= NOW()`,
    [productId],
  );
}

export async function createTransportBooking(userId: string, input: { tripId?: unknown; seats?: unknown }) {
  if (typeof input.tripId !== 'string' || !input.tripId.trim()) {
    throw new DomainError('Trajet invalide.', 400, 'TRIP_REQUIRED');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tripResult = await client.query<{
      id: string;
      price_xof: number;
      seat_capacity: number;
      depart_at: Date;
    }>(
      'SELECT id, price_xof, seat_capacity, depart_at FROM bus_trips WHERE id = $1 FOR UPDATE',
      [input.tripId],
    );
    const trip = tripResult.rows[0];
    if (!trip || new Date(trip.depart_at).getTime() <= Date.now()) {
      throw new DomainError('Ce départ n’est plus disponible.', 404, 'TRIP_UNAVAILABLE');
    }

    const seats = validateSeats(input.seats, Number(trip.seat_capacity));
    await expireOldHolds(client, 'bus_trip_id', trip.id);

    const occupiedResult = await client.query<{ occupied: number[] }>(
      `SELECT COALESCE(ARRAY_AGG(DISTINCT used_seats.seat_number), '{}'::INTEGER[]) AS occupied
       FROM bookings b
       CROSS JOIN LATERAL UNNEST(b.seats) AS used_seats(seat_number)
       WHERE b.bus_trip_id = $1
         AND (b.status = 'paid' OR (b.status = 'pending_payment' AND b.hold_expires_at > NOW()))`,
      [trip.id],
    );
    const occupied = new Set((occupiedResult.rows[0]?.occupied ?? []).map(Number));
    const conflict = seats.find((seat) => occupied.has(seat));
    if (conflict !== undefined) {
      throw new DomainError(`Le siège ${conflict} vient d’être réservé. Choisissez-en un autre.`, 409, 'SEAT_UNAVAILABLE');
    }

    const bookingId = randomUUID();
    const amount = Number(trip.price_xof) * seats.length;
    const { rows } = await client.query(
      `INSERT INTO bookings (
         id, user_id, product_type, bus_trip_id, seats, quantity, amount_xof, hold_expires_at
       ) VALUES ($1, $2, 'transport', $3, $4, $5, $6, NOW() + ($7 * INTERVAL '1 minute'))
       RETURNING id, product_type, bus_trip_id, seats, quantity, amount_xof, currency, status, hold_expires_at, created_at`,
      [bookingId, userId, trip.id, seats, seats.length, amount, HOLD_MINUTES],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createEventBooking(
  userId: string,
  input: { eventId?: unknown; categoryId?: unknown; quantity?: unknown },
) {
  if (typeof input.eventId !== 'string' || !input.eventId.trim() || typeof input.categoryId !== 'string' || !input.categoryId.trim()) {
    throw new DomainError('Événement ou catégorie invalide.', 400, 'EVENT_REQUIRED');
  }
  const quantity = validateQuantity(input.quantity);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const categoryResult = await client.query<{
      id: string;
      event_id: string;
      price_xof: number;
      capacity: number;
      starts_at: Date;
      event_status: string;
    }>(
      `SELECT c.id, c.event_id, c.price_xof, c.capacity, e.starts_at, e.status AS event_status
       FROM event_ticket_categories c
       JOIN events e ON e.id = c.event_id
       WHERE c.id = $1 AND c.event_id = $2
       FOR UPDATE OF c`,
      [input.categoryId, input.eventId],
    );
    const category = categoryResult.rows[0];
    if (!category || category.event_status !== 'published' || new Date(category.starts_at).getTime() <= Date.now()) {
      throw new DomainError('Cet événement ou cette catégorie n’est plus disponible.', 404, 'EVENT_UNAVAILABLE');
    }

    await expireOldHolds(client, 'ticket_category_id', category.id);
    const reservedResult = await client.query<{ quantity: string }>(
      `SELECT COALESCE(SUM(quantity), 0)::TEXT AS quantity
       FROM bookings
       WHERE ticket_category_id = $1
         AND (status = 'paid' OR (status = 'pending_payment' AND hold_expires_at > NOW()))`,
      [category.id],
    );
    const reserved = Number(reservedResult.rows[0]?.quantity ?? 0);
    if (reserved + quantity > Number(category.capacity)) {
      throw new DomainError('Il ne reste pas assez de billets dans cette catégorie.', 409, 'EVENT_SOLD_OUT');
    }

    const bookingId = randomUUID();
    const amount = Number(category.price_xof) * quantity;
    const { rows } = await client.query(
      `INSERT INTO bookings (
         id, user_id, product_type, event_id, ticket_category_id, quantity, amount_xof, hold_expires_at
       ) VALUES ($1, $2, 'event', $3, $4, $5, $6, NOW() + ($7 * INTERVAL '1 minute'))
       RETURNING id, product_type, event_id, ticket_category_id, quantity, amount_xof, currency, status, hold_expires_at, created_at`,
      [bookingId, userId, category.event_id, category.id, quantity, amount, HOLD_MINUTES],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserBooking(userId: string, bookingId: string) {
  const { rows } = await pool.query(
    `SELECT b.id, b.product_type, b.bus_trip_id, b.event_id, b.ticket_category_id,
            b.seats, b.quantity, b.amount_xof, b.currency,
            CASE WHEN b.status = 'pending_payment' AND b.hold_expires_at <= NOW() THEN 'expired' ELSE b.status END AS status,
            b.hold_expires_at, b.created_at, p.provider_reference, p.checkout_url, p.status AS payment_status,
            bt.carrier, bt.depart_city, bt.depart_station, bt.arrival_city, bt.arrival_station, bt.depart_at,
            e.title AS event_title, e.venue, e.city, e.starts_at, c.name AS category_name
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id = b.id
     LEFT JOIN bus_trips bt ON bt.id = b.bus_trip_id
     LEFT JOIN events e ON e.id = b.event_id
     LEFT JOIN event_ticket_categories c ON c.id = b.ticket_category_id
     WHERE b.id = $1 AND b.user_id = $2`,
    [bookingId, userId],
  );
  if (!rows[0]) throw new DomainError('Réservation introuvable.', 404, 'BOOKING_NOT_FOUND');
  return rows[0];
}
