import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { orderController } from './order.controller.js';

export const orderRoutes = Router();
orderRoutes.get('/bookings/:bookingId', requireAuth, asyncHandler(orderController.bookingDetails));
orderRoutes.get('/orders', requireAuth, asyncHandler(orderController.list));
