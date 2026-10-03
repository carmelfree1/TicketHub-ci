import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { catalogController } from './catalog.controller.js';
import { eventRoutes } from '../events/event.routes.js';
import { tripRoutes } from '../trips/trip.routes.js';

export const catalogRoutes = Router();
catalogRoutes.get('/catalog/summary', asyncHandler(catalogController.summary));
catalogRoutes.use(tripRoutes);
catalogRoutes.use(eventRoutes);
