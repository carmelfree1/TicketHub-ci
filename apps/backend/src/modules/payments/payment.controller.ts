import type { RequestHandler } from 'express';
import { sendCreated, sendSuccess } from '../../core/http/response.js';
import { AppError } from '../../core/errors/AppError.js';
import { paymentService } from './payment.service.js';
import type { PaymentMethodId } from './payment.types.js';

export const paymentController = {
  start: (async (request, response) => sendCreated(response, await paymentService.start(request.authUser!.id, request.params.bookingId, request.body.paymentMethod as PaymentMethodId))) as RequestHandler,
  webhook: (async (request, response) => {
    if (!Buffer.isBuffer(request.body)) throw new AppError('Corps webhook manquant.', 400, 'INVALID_WEBHOOK_BODY');
    const result = await paymentService.handleWebhook({
      signature: request.get('X-Webhook-Signature') || '',
      timestamp: request.get('X-Webhook-Timestamp') || '',
      deliveryId: request.get('X-Webhook-Delivery'),
      rawBody: request.body,
    });
    response.status(200).json(result);
  }) as RequestHandler,
};
