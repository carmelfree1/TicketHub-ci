import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { catalogService } from './catalog.service.js';

export const catalogController = {
  summary: (async (_request, response) => sendSuccess(response, await catalogService.summary())) as RequestHandler,
};
