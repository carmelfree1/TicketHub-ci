import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/response.js';
import { AppError } from '../../core/errors/AppError.js';
import { BusinessError } from '../../core/errors/BusinessError.js';
import { auditService, requestContext } from '../audit/audit.service.js';
import { securityEventService } from '../security/security-event.service.js';
import { ticketService } from './ticket.service.js';

export const ticketController = {
  listMine: (async (request, response) => sendSuccess(response, await ticketService.listUserTickets(request.authUser!.id))) as RequestHandler,
  scan: (async (request, response) => {
    const context = requestContext(request);
    try {
      const result = await ticketService.consume(request.authUser!.id, request.body);
      await auditService.record({ action: 'ticket.scanned', resourceType: 'ticket', resourceId: result.ticketId, metadata: { result: 'used' }, ...context });
      sendSuccess(response, result);
    } catch (error) {
      if (error instanceof AppError || error instanceof BusinessError) {
        await auditService.record({ action: 'ticket.scan_rejected', metadata: { code: error.code }, ...context });
        if (error.code === 'WRONG_PROVIDER') {
          await securityEventService.record({ eventType: 'ticket.wrong_provider_scan', userId: context.userId ?? undefined, metadata: { severity: 'high' }, ipAddress: context.ipAddress, userAgent: context.userAgent });
        }
      }
      throw error;
    }
  }) as RequestHandler,
  manifest: (async (request, response) => {
    const manifest = await ticketService.listManifest(request.authUser!.id, request.params.tripId);
    await auditService.record({ action: 'manifest.viewed', resourceType: 'trip', resourceId: request.params.tripId, ...requestContext(request) });
    sendSuccess(response, manifest);
  }) as RequestHandler,
};
