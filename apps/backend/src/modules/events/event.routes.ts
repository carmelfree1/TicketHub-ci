import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validateQuery } from '../../middleware/validate.js';
import { eventController } from './event.controller.js';
import { eventQuerySchema } from './event.schema.js';

export const eventRoutes = Router();
eventRoutes.get('/catalog/events', validateQuery(eventQuerySchema), asyncHandler(eventController.list));
eventRoutes.get('/catalog/events/:eventId', asyncHandler(eventController.get));
