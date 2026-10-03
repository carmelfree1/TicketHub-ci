import type { Pool } from 'pg';
import { MOCK_TRIPS } from '../src/data/mockData.js';
import { MOCK_EVENTS } from '../src/data/eventData.js';

function dateInDays(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function seedDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
      const day = dateInDays(dayOffset);
      const dateId = day.toISOString().slice(0, 10).replaceAll('-', '');
      for (const trip of MOCK_TRIPS) {
        const [hour, minute] = trip.departTime.split(':').map(Number);
        const departAt = new Date(day);
        departAt.setUTCHours(hour, minute, 0, 0);
        const id = `${trip.id}-${dateId}`;

        await client.query(
          `INSERT INTO bus_trips (
             id, carrier, carrier_code, service_title, depart_at, depart_station,
             depart_city, arrival_station, arrival_city, arrival_time, duration,
             price_xof, seat_capacity, amenities, vehicle, registration
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            trip.carrier,
            trip.carrierCode,
            trip.serviceTitle,
            departAt.toISOString(),
            trip.departStation,
            trip.departCity,
            trip.arrivalStation,
            trip.arrivalCity,
            trip.arrivalTime,
            trip.duration,
            trip.price,
            41,
            JSON.stringify(trip.amenities),
            trip.vehicle,
            trip.registration,
          ],
        );
      }
    }

    for (const event of MOCK_EVENTS) {
      await client.query(
        `INSERT INTO events (id, title, event_type, description, venue, city, starts_at, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          event.id,
          event.title,
          event.eventType,
          event.description,
          event.venue,
          event.city,
          event.startsAt,
          event.imageUrl,
        ],
      );

      for (const category of event.categories) {
        await client.query(
          `INSERT INTO event_ticket_categories (id, event_id, name, price_xof, capacity)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [category.id, event.id, category.name, category.price, category.capacity],
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
