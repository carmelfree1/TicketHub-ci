import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { refundController } from './refund.controller.js';
import { createRefundSchema } from './refund.schema.js';

export const refundRoutes = Router();
refundRoutes.post('/refunds', requireAuth, authorize('refund:request'), validateBody(createRefundSchema), asyncHandler(refundController.request));
refundRoutes.get('/refunds/mine', requireAuth, asyncHandler(refundController.list));
