import { scanRateLimit } from '../../core/security/rate-limit.js';
import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { ticketController } from './ticket.controller.js';
import { scanTicketSchema } from './ticket.schema.js';

export const ticketRoutes = Router();
ticketRoutes.get('/tickets', requireAuth, authorize('ticket:read:own'), asyncHandler(ticketController.listMine));
ticketRoutes.post('/partner/scans', requireAuth, scanRateLimit, authorize('partner:scan'), validateBody(scanTicketSchema), asyncHandler(ticketController.scan));
ticketRoutes.get('/partner/manifest/:tripId', requireAuth, authorize('partner:manifest'), asyncHandler(ticketController.manifest));
