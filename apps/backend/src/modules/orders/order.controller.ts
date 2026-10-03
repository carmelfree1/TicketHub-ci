import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { orderService } from './order.service.js';

export const orderController = {
  bookingDetails: (async (request, response) => sendSuccess(response, await orderService.getBooking(request.authUser!.id, request.params.bookingId))) as RequestHandler,
  list: (async (request, response) => sendSuccess(response, await orderService.list(request.authUser!.id))) as RequestHandler,
};
