import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { eventService } from './event.service.js';
import type { EventQuery } from './event.types.js';

export const eventController = {
  list: (async (request, response) => sendSuccess(response, await eventService.list((request.validatedQuery || {}) as EventQuery))) as RequestHandler,
  get: (async (request, response) => sendSuccess(response, await eventService.get(request.params.eventId))) as RequestHandler,
};
