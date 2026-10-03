import type { RequestHandler } from 'express';
import { sendCreated, sendSuccess } from '../../core/http/response.js';
import { refundService } from './refund.service.js';

export const refundController = {
  request: (async (request, response) => sendCreated(response, await refundService.request(request.authUser!.id, request.body))) as RequestHandler,
  list: (async (request, response) => sendSuccess(response, await refundService.list(request.authUser!.id))) as RequestHandler,
};
