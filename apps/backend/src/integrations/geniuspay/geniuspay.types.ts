export interface GeniusPayCreatePaymentInput {
  amount: number;
  currency: 'XOF';
  description: string;
  customer: { name: string; phone: string; country: 'CI' };
  successUrl: string;
  errorUrl: string;
  metadata: Record<string, string>;
  paymentMethod?: string;
}

export interface GeniusPayPayment {
  reference: string;
  checkoutUrl: string;
  status?: string;
}

export interface GeniusPayWebhookPayload {
  id?: string;
  event?: string;
  data?: {
    reference?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
}
