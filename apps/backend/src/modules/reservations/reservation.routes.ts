import { reservationRateLimit } from '../../core/security/rate-limit.js';
import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { reservationController } from './reservation.controller.js';
import { eventReservationSchema, transportReservationSchema } from './reservation.schema.js';

export const reservationRoutes = Router();
reservationRoutes.post('/bookings/transport', requireAuth, reservationRateLimit, authorize('booking:create'), validateBody(transportReservationSchema), asyncHandler(reservationController.createTransport));
reservationRoutes.post('/bookings/event', requireAuth, reservationRateLimit, authorize('booking:create'), validateBody(eventReservationSchema), asyncHandler(reservationController.createEvent));
