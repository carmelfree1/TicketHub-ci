import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { settlementService } from './settlement.service.js';

export const settlementController = {
  list: (async (_request, response) => sendSuccess(response, await settlementService.list())) as RequestHandler,
};
