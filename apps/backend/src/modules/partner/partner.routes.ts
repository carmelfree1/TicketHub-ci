import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { partnerController } from './partner.controller.js';

export const partnerRoutes = Router();
// `me` answers an unlinked partner too, so the interface can tell them how to link the account.
partnerRoutes.get('/partner/me', requireAuth, authorize('partner:manifest'), asyncHandler(partnerController.me));
partnerRoutes.get('/partner/trips', requireAuth, authorize('partner:manifest'), asyncHandler(partnerController.trips));
partnerRoutes.get('/partner/stats', requireAuth, authorize('partner:manifest'), asyncHandler(partnerController.stats));
