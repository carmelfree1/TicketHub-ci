import type { RequestHandler } from 'express';
import { sendCreated } from '../../core/http/response.js';
import { reservationService } from './reservation.service.js';

export const reservationController = {
  createTransport: (async (request, response) => sendCreated(response, await reservationService.createTransport(request.authUser!.id, request.body))) as RequestHandler,
  createEvent: (async (request, response) => sendCreated(response, await reservationService.createEvent(request.authUser!.id, request.body))) as RequestHandler,
};
