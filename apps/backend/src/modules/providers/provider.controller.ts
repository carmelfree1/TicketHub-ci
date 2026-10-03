import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { providerService } from './provider.service.js';

export const providerController = {
  list: (async (_request, response) => sendSuccess(response, await providerService.list())) as RequestHandler,
  get: (async (request, response) => sendSuccess(response, await providerService.get(request.params.id))) as RequestHandler,
};
