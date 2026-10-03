import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';
import type { GeniusPayCreatePaymentInput, GeniusPayPayment } from './geniuspay.types.js';

export async function createGeniusPayPayment(input: GeniusPayCreatePaymentInput): Promise<GeniusPayPayment> {
  if (!env.GENIUSPAY_API_KEY || !env.GENIUSPAY_API_SECRET) {
    throw new AppError('La passerelle GeniusPay n’est pas configurée.', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
  const response = await fetch(`${env.GENIUSPAY_API_BASE_URL.replace(/\/$/, '')}/payments`, {
    method: 'POST',
    headers: {
      'X-API-Key': env.GENIUSPAY_API_KEY,
      'X-API-Secret': env.GENIUSPAY_API_SECRET,
      ...(input.metadata.idempotency_key ? { 'Idempotency-Key': input.metadata.idempotency_key } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(input.paymentMethod ? { payment_method: input.paymentMethod } : {}),
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      customer: input.customer,
      success_url: input.successUrl,
      error_url: input.errorUrl,
      metadata: input.metadata,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as {
    data?: { reference?: string; checkout_url?: string; payment_url?: string; status?: string };
    error?: { message?: string };
  };
  const reference = result.data?.reference;
  const checkoutUrl = result.data?.checkout_url || result.data?.payment_url;
  if (!response.ok || !reference || !checkoutUrl || !/^https:\/\//i.test(checkoutUrl)) {
    throw new AppError(result.error?.message || 'La réponse du checkout GeniusPay est invalide.', 502, 'PAYMENT_PROVIDER_ERROR');
  }
  return { reference, checkoutUrl, status: result.data?.status };
}
