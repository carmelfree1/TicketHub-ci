import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { ticketService } from './ticket.service.js';

export const ticketController = {
  listMine: (async (request, response) => sendSuccess(response, await ticketService.listUserTickets(request.authUser!.id))) as RequestHandler,
  scan: (async (request, response) => sendSuccess(response, await ticketService.consume(request.body))) as RequestHandler,
  manifest: (async (request, response) => sendSuccess(response, await ticketService.listManifest(request.params.tripId))) as RequestHandler,
};
