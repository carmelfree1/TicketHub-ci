import type { RequestHandler } from 'express';
import { sendCreated } from '../../core/http/response.js';
import { auditService, requestContext } from '../audit/audit.service.js';
import { reservationService } from './reservation.service.js';

export const reservationController = {
  createTransport: (async (request, response) => {
    const booking = await reservationService.createTransport(request.authUser!.id, request.body);
    await auditService.record({ action: 'booking.created', resourceType: 'booking', resourceId: booking.id, metadata: { productType: 'transport' }, ...requestContext(request) });
    sendCreated(response, booking);
  }) as RequestHandler,
  createEvent: (async (request, response) => {
    const booking = await reservationService.createEvent(request.authUser!.id, request.body);
    await auditService.record({ action: 'booking.created', resourceType: 'booking', resourceId: booking.id, metadata: { productType: 'event' }, ...requestContext(request) });
    sendCreated(response, booking);
  }) as RequestHandler,
};
