import type { RequestHandler } from 'express';
import { sendCreated } from '../../core/http/response.js';
import { AppError } from '../../core/errors/AppError.js';
import { auditService, requestContext } from '../audit/audit.service.js';
import { securityEventService } from '../security/security-event.service.js';
import { paymentService } from './payment.service.js';
import type { PaymentMethodId } from './payment.types.js';

export const paymentController = {
  start: (async (request, response) => {
    const payment = await paymentService.start(request.authUser!.id, request.params.bookingId, request.body.paymentMethod as PaymentMethodId);
    await auditService.record({ action: 'payment.started', resourceType: 'booking', resourceId: request.params.bookingId, metadata: { method: request.body.paymentMethod }, ...requestContext(request) });
    sendCreated(response, payment);
  }) as RequestHandler,
  webhook: (async (request, response) => {
    if (!Buffer.isBuffer(request.body)) throw new AppError('Corps webhook manquant.', 400, 'INVALID_WEBHOOK_BODY');
    const context = requestContext(request);
    try {
      const result = await paymentService.handleWebhook({
        signature: request.get('X-Webhook-Signature') || '',
        timestamp: request.get('X-Webhook-Timestamp') || '',
        deliveryId: request.get('X-Webhook-Delivery'),
        rawBody: request.body,
      });
      if (!result.duplicate) {
        await auditService.record({ action: 'payment.webhook_processed', resourceType: 'webhook', metadata: { event: request.get('X-Webhook-Event') ?? null }, ...context });
      }
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError && ['INVALID_WEBHOOK_SIGNATURE', 'PAYMENT_AMOUNT_MISMATCH', 'PAYMENT_NOT_FOUND'].includes(error.code)) {
        await securityEventService.record({ eventType: `webhook.${error.code.toLowerCase()}`, metadata: { severity: error.code === 'INVALID_WEBHOOK_SIGNATURE' ? 'critical' : 'high' }, ipAddress: context.ipAddress, userAgent: context.userAgent });
      }
      throw error;
    }
  }) as RequestHandler,
};
