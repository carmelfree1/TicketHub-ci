import { Router } from 'express';
import { paymentRateLimit, webhookRateLimit } from '../../core/security/rate-limit.js';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authorize } from '../../middleware/authorize.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { rawJsonBody } from '../../middleware/raw-body.js';
import { validateBody } from '../../middleware/validate.js';
import { paymentController } from './payment.controller.js';
import { paymentMethodSchema } from './payment.schema.js';

export const paymentRoutes = Router();
paymentRoutes.post('/bookings/:bookingId/payment', requireAuth, paymentRateLimit, authorize('booking:create'), validateBody(paymentMethodSchema), asyncHandler(paymentController.start));

export const paymentWebhookRoutes = Router();
paymentWebhookRoutes.post('/api/webhooks/geniuspay', webhookRateLimit, rawJsonBody, asyncHandler(paymentController.webhook));
