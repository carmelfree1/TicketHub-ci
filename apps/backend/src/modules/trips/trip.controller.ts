import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { tripService } from './trip.service.js';
import type { TripQuery } from './trip.types.js';

export const tripController = {
  list: (async (request, response) => sendSuccess(response, await tripService.list((request.validatedQuery || {}) as TripQuery))) as RequestHandler,
  // Kept unwrapped to match the existing frontend's seat-map API contract.
  seats: (async (request, response) => response.json(await tripService.seats(request.params.tripId))) as RequestHandler,
};
