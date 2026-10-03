import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validateQuery } from '../../middleware/validate.js';
import { tripController } from './trip.controller.js';
import { tripQuerySchema } from './trip.schema.js';

export const tripRoutes = Router();
tripRoutes.get('/catalog/trips', validateQuery(tripQuerySchema), asyncHandler(tripController.list));
tripRoutes.get('/catalog/trips/:tripId/seats', asyncHandler(tripController.seats));
