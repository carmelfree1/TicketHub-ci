import { createGeniusPayPayment } from './geniuspay.client.js';
import { mapPaymentMethod } from './geniuspay.mapper.js';
import type { PaymentMethodId } from '../../modules/payments/payment.types.js';

export const geniusPayAdapter = {
  createPayment(input: {
    amount: number;
    description: string;
    customer: { name: string; phone: string };
    bookingId: string;
    userId: string;
    productType: 'transport' | 'event';
    idempotencyKey: string;
    paymentMethod: PaymentMethodId;
    appUrl: string;
  }) {
    return createGeniusPayPayment({
      amount: input.amount,
      currency: 'XOF',
      description: `${input.description} — réservation ${input.bookingId}`.slice(0, 500),
      customer: { ...input.customer, country: 'CI' },
      successUrl: `${input.appUrl}/?payment=return&booking=${encodeURIComponent(input.bookingId)}`,
      errorUrl: `${input.appUrl}/?payment=failed&booking=${encodeURIComponent(input.bookingId)}`,
      metadata: {
        booking_id: input.bookingId,
        user_id: input.userId,
        product_type: input.productType,
        idempotency_key: input.idempotencyKey,
        requested_method: input.paymentMethod,
      },
      paymentMethod: mapPaymentMethod(input.paymentMethod),
    });
  },
};
