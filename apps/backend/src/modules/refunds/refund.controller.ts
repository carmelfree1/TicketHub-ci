import type { RequestHandler } from 'express';
import { sendCreated, sendSuccess } from '../../core/http/response.js';
import { auditService, requestContext } from '../audit/audit.service.js';
import { refundService } from './refund.service.js';

export const refundController = {
  request: (async (request, response) => {
    const refund = await refundService.request(request.authUser!.id, request.body);
    await auditService.record({ action: 'refund.requested', resourceType: 'refund', resourceId: (refund as { id?: string }).id, metadata: { bookingId: request.body.bookingId }, ...requestContext(request) });
    sendCreated(response, refund);
  }) as RequestHandler,
  list: (async (request, response) => sendSuccess(response, await refundService.list(request.authUser!.id))) as RequestHandler,
};
