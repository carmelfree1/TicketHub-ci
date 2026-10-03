import { randomUUID, timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware, destroySession, hashPassword, issueSession, normalizePhone, requireAuth, requireRole, verifyPassword } from './auth.js';
import { pool } from './db.js';
import { DomainError } from './domain.js';
import type { AuthUser, BusTripRow } from './types.js';
import { createEventBooking, createTransportBooking, getUserBooking } from './services/bookings.js';
import { processGeniusPayWebhook, startGeniusPayPayment } from './services/payments.js';
import { consumeTicket, listUserTickets } from './services/tickets.js';

const asyncRoute = (handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (request, response, next) => {
    void handler(request, response, next).catch(next);
  };

function matchesInviteCode(provided: unknown): boolean {
  const expected = process.env.PARTNER_INVITE_CODE;
  if (!expected || typeof provided !== 'string') return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function toTrip(row: BusTripRow) {
  const occupied = (row.occupied_seats ?? []).map(Number);
  return {
    id: row.id,
    carrier: row.carrier,
    carrierCode: row.carrier_code,
    serviceTitle: row.service_title,
    departTime: new Date(row.depart_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' }),
    departAt: new Date(row.depart_at).toISOString(),
    departStation: row.depart_station,
    departCity: row.depart_city,
    arrivalTime: row.arrival_time,
    arrivalStation: row.arrival_station,
    arrivalCity: row.arrival_city,
    duration: row.duration,
    price: Number(row.price_xof),
    availableSeats: Number(row.seat_capacity) - occupied.length,
    seatCapacity: Number(row.seat_capacity),
    occupiedSeats: occupied,
    amenities: row.amenities,
    vehicle: row.vehicle,
    registration: row.registration,
  };
}

const occupiedSeatsSql = `ARRAY(
  SELECT DISTINCT seats.seat_number
  FROM bookings b
  CROSS JOIN LATERAL UNNEST(b.seats) AS seats(seat_number)
  WHERE b.bus_trip_id = bt.id
    AND (b.status = 'paid' OR (b.status = 'pending_payment' AND b.hold_expires_at > NOW()))
  ORDER BY seats.seat_number
) AS occupied_seats`;

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // GeniusPay signatures are computed from the original raw JSON body.
  app.post(
    '/api/webhooks/geniuspay',
    express.raw({ type: 'application/json', limit: '128kb' }),
    asyncRoute(async (request, response) => {
      if (!Buffer.isBuffer(request.body)) {
        throw new DomainError('Corps webhook manquant.', 400, 'INVALID_WEBHOOK_BODY');
      }
      const result = await processGeniusPayWebhook({
        signature: request.get('X-Webhook-Signature') || '',
        timestamp: request.get('X-Webhook-Timestamp') || '',
        deliveryId: request.get('X-Webhook-Delivery'),
        rawBody: request.body,
      });
      response.status(200).json(result);
    }),
  );

  app.use(express.json({ limit: '64kb' }));
  app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 12,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Trop de tentatives. Réessayez dans quelques minutes.' } },
  }));
  app.use((request, _response, next) => {
    if (
      process.env.NODE_ENV === 'production' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.path !== '/api/webhooks/geniuspay'
    ) {
      const origin = request.get('origin');
      const expectedOrigin = process.env.WEB_ORIGIN || process.env.APP_URL;
      if (origin && expectedOrigin && new URL(origin).origin !== new URL(expectedOrigin).origin) {
        next(new DomainError('Origine de requête non autorisée.', 403, 'ORIGIN_FORBIDDEN'));
        return;
      }
    }
    next();
  });
  app.use(authMiddleware);

  app.get('/api/health', asyncRoute(async (_request, response) => {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  }));

  app.post('/api/auth/register', asyncRoute(async (request, response) => {
    const fullName = typeof request.body?.fullName === 'string' ? request.body.fullName.trim() : '';
    if (fullName.length < 2 || fullName.length > 100) {
      throw new DomainError('Le nom doit contenir entre 2 et 100 caractères.', 400, 'INVALID_NAME');
    }
    const phone = normalizePhone(request.body?.phone);
    const passwordHash = await hashPassword(request.body?.password);
    const role = matchesInviteCode(request.body?.partnerInviteCode) ? 'partner' : 'traveler';
    const id = randomUUID();

    try {
      await pool.query(
        'INSERT INTO users (id, full_name, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        [id, fullName, phone, passwordHash, role],
      );
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new DomainError('Un compte existe déjà avec ce numéro.', 409, 'PHONE_ALREADY_REGISTERED');
      }
      throw error;
    }

    await issueSession(id, response);
    response.status(201).json({ user: { id, fullName, phone, role } });
  }));

  app.post('/api/auth/login', asyncRoute(async (request, response) => {
    const phone = normalizePhone(request.body?.phone);
    const { rows } = await pool.query<{
      id: string;
      full_name: string;
      phone: string;
      password_hash: string;
      role: AuthUser['role'];
    }>('SELECT id, full_name, phone, password_hash, role FROM users WHERE phone = $1', [phone]);
    const user = rows[0];
    if (!user || !(await verifyPassword(request.body?.password, user.password_hash))) {
      throw new DomainError('Numéro ou mot de passe incorrect.', 401, 'INVALID_CREDENTIALS');
    }

    await issueSession(user.id, response);
    response.json({
      user: { id: user.id, fullName: user.full_name, phone: user.phone, role: user.role },
    });
  }));

  app.get('/api/auth/me', (request, response) => {
    response.json({ user: request.authUser ?? null });
  });

  app.post('/api/auth/logout', asyncRoute(async (request, response) => {
    await destroySession(request, response);
    response.status(204).end();
  }));

  app.get('/api/catalog/trips', asyncRoute(async (request, response) => {
    const from = typeof request.query.from === 'string' ? `%${request.query.from.trim()}%` : null;
    const to = typeof request.query.to === 'string' ? `%${request.query.to.trim()}%` : null;
    const date = typeof request.query.date === 'string' ? request.query.date : null;
    const { rows } = await pool.query<BusTripRow>(
      `SELECT bt.*, ${occupiedSeatsSql}
       FROM bus_trips bt
       WHERE bt.depart_at > NOW()
         AND ($1::text IS NULL OR bt.depart_city ILIKE $1 OR bt.depart_station ILIKE $1)
         AND ($2::text IS NULL OR bt.arrival_city ILIKE $2 OR bt.arrival_station ILIKE $2)
         AND ($3::date IS NULL OR bt.depart_at::date = $3::date)
       ORDER BY bt.depart_at ASC
       LIMIT 100`,
      [from || null, to || null, date],
    );
    response.json({ data: rows.map(toTrip) });
  }));

  app.get('/api/catalog/trips/:tripId/seats', asyncRoute(async (request, response) => {
    const { rows } = await pool.query<BusTripRow>(
      `SELECT bt.*, ${occupiedSeatsSql}
       FROM bus_trips bt
       WHERE bt.id = $1 AND bt.depart_at > NOW()`,
      [request.params.tripId],
    );
    const trip = rows[0];
    if (!trip) throw new DomainError('Départ introuvable ou expiré.', 404, 'TRIP_UNAVAILABLE');
    const occupied = new Set((trip.occupied_seats ?? []).map(Number));
    response.json({
      tripId: trip.id,
      capacity: Number(trip.seat_capacity),
      seats: Array.from({ length: Number(trip.seat_capacity) }, (_, index) => ({
        number: index + 1,
        status: occupied.has(index + 1) ? 'occupied' : 'available',
      })),
    });
  }));

  app.get('/api/catalog/events', asyncRoute(async (request, response) => {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.event_type, e.description, e.venue, e.city, e.starts_at, e.image_url,
              COALESCE(json_agg(json_build_object(
                'id', c.id,
                'name', c.name,
                'price', c.price_xof,
                'capacity', c.capacity,
                'available', GREATEST(c.capacity - COALESCE(reserved.quantity, 0), 0)
              )) FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS categories
       FROM events e
       LEFT JOIN event_ticket_categories c ON c.event_id = e.id
       LEFT JOIN LATERAL (
         SELECT SUM(b.quantity)::INTEGER AS quantity
         FROM bookings b
         WHERE b.ticket_category_id = c.id
           AND (b.status = 'paid' OR (b.status = 'pending_payment' AND b.hold_expires_at > NOW()))
       ) reserved ON TRUE
       WHERE e.status = 'published' AND e.starts_at > NOW()
       GROUP BY e.id
       ORDER BY e.starts_at ASC
       LIMIT 100`,
    );
    response.json({ data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      eventType: row.event_type,
      description: row.description,
      venue: row.venue,
      city: row.city,
      startsAt: new Date(row.starts_at).toISOString(),
      imageUrl: row.image_url,
      categories: row.categories,
    })) });
  }));

  app.get('/api/catalog/events/:eventId', asyncRoute(async (request, response) => {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.event_type, e.description, e.venue, e.city, e.starts_at, e.image_url,
              COALESCE(json_agg(json_build_object(
                'id', c.id,
                'name', c.name,
                'price', c.price_xof,
                'capacity', c.capacity,
                'available', GREATEST(c.capacity - COALESCE(reserved.quantity, 0), 0)
              )) FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS categories
       FROM events e
       LEFT JOIN event_ticket_categories c ON c.event_id = e.id
       LEFT JOIN LATERAL (
         SELECT SUM(b.quantity)::INTEGER AS quantity
         FROM bookings b
         WHERE b.ticket_category_id = c.id
           AND (b.status = 'paid' OR (b.status = 'pending_payment' AND b.hold_expires_at > NOW()))
       ) reserved ON TRUE
       WHERE e.id = $1 AND e.status = 'published' AND e.starts_at > NOW()
       GROUP BY e.id`,
      [request.params.eventId],
    );
    const event = rows[0];
    if (!event) throw new DomainError('Événement introuvable.', 404, 'EVENT_NOT_FOUND');
    response.json({ data: {
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      description: event.description,
      venue: event.venue,
      city: event.city,
      startsAt: new Date(event.starts_at).toISOString(),
      imageUrl: event.image_url,
      categories: event.categories,
    } });
  }));

  app.post('/api/bookings/transport', requireAuth, asyncRoute(async (request, response) => {
    const booking = await createTransportBooking(request.authUser!.id, request.body ?? {});
    response.status(201).json({ data: booking });
  }));

  app.post('/api/bookings/event', requireAuth, asyncRoute(async (request, response) => {
    const booking = await createEventBooking(request.authUser!.id, request.body ?? {});
    response.status(201).json({ data: booking });
  }));

  app.get('/api/bookings/:bookingId', requireAuth, asyncRoute(async (request, response) => {
    const booking = await getUserBooking(request.authUser!.id, request.params.bookingId);
    response.json({ data: booking });
  }));

  app.post('/api/bookings/:bookingId/payment', requireAuth, asyncRoute(async (request, response) => {
    const payment = await startGeniusPayPayment(
      request.authUser!.id,
      request.params.bookingId,
      request.body?.paymentMethod,
    );
    response.status(201).json({ data: payment });
  }));

  app.get('/api/tickets', requireAuth, asyncRoute(async (request, response) => {
    response.json({ data: await listUserTickets(request.authUser!) });
  }));

  app.post('/api/partner/scans', requireRole('partner'), asyncRoute(async (request, response) => {
    const result = await consumeTicket({ token: request.body?.token, ticketCode: request.body?.ticketCode });
    response.json({ data: result });
  }));

  app.get('/api/partner/manifest/:tripId', requireRole('partner'), asyncRoute(async (request, response) => {
    const { rows } = await pool.query(
      `SELECT t.code AS ticket_code, t.status AS ticket_status, t.used_at,
              b.id AS booking_id, b.amount_xof, b.quantity, b.seats[t.ordinal + 1] AS seat_number,
              u.full_name, u.phone, p.payment_method
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN tickets t ON t.booking_id = b.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.bus_trip_id = $1 AND b.status = 'paid'
       ORDER BY b.created_at, t.ordinal`,
      [request.params.tripId],
    );
    response.json({ data: rows.map((row) => ({
      ticketCode: row.ticket_code,
      status: row.ticket_status,
      usedAt: row.used_at,
      bookingId: row.booking_id,
      price: Number(row.amount_xof) / Number(row.quantity),
      seatNumber: row.seat_number,
      name: row.full_name,
      phone: row.phone,
      paymentMethod: row.payment_method,
    })) });
  }));

  app.use('/api', (_request, _response, next) => {
    next(new DomainError('Route API introuvable.', 404, 'ROUTE_NOT_FOUND'));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof DomainError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {
      response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Corps JSON invalide.' } });
      return;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      response.status(504).json({ error: { code: 'UPSTREAM_TIMEOUT', message: 'La passerelle est momentanément indisponible.' } });
      return;
    }
    console.error('[api]', error);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } });
  });

  return app;
}
