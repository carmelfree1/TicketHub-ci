import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { settlementService } from './settlement.service.js';

export const settlementController = {
  list: (async (request, response) => sendSuccess(response, await settlementService.listForUser(request.authUser!.id))) as RequestHandler,
};
