export type PaymentMethodId = 'wave' | 'orange' | 'mtn' | 'moov' | 'cb';

export interface StartPaymentInput {
  bookingId: string;
  paymentMethod: PaymentMethodId;
}
