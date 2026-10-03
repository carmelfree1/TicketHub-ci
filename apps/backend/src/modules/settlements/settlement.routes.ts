import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { settlementController } from './settlement.controller.js';

export const settlementRoutes = Router();
settlementRoutes.get('/partner/settlements', requireAuth, authorize('partner:manifest'), asyncHandler(settlementController.list));
