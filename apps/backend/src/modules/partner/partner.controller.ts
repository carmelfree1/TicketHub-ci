import type { RequestHandler } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../core/http/response.js';
import { partnerService } from './partner.service.js';

const periodSchema = z.enum(['today', 'week', 'month']).catch('today');

export const partnerController = {
  me: (async (request, response) => sendSuccess(response, await partnerService.me(request.authUser!.id))) as RequestHandler,
  trips: (async (request, response) => sendSuccess(response, await partnerService.trips(request.authUser!.id))) as RequestHandler,
  stats: (async (request, response) => {
    sendSuccess(response, await partnerService.stats(request.authUser!.id, periodSchema.parse(request.query.period)));
  }) as RequestHandler,
};
