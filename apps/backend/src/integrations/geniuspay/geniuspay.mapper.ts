import type { PaymentMethodId } from '../../modules/payments/payment.types.js';

const providerMethods: Record<PaymentMethodId, string | undefined> = {
  wave: 'wave',
  orange: 'orange_money',
  mtn: 'mtn_money',
  moov: undefined,
  cb: 'card',
};

export function mapPaymentMethod(method: PaymentMethodId): string | undefined {
  return providerMethods[method];
}

export function paymentMethodLabel(method?: string | null): string {
  const labels: Record<string, string> = {
    wave: 'Wave', orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money', cb: 'Carte bancaire', checkout: 'GeniusPay',
  };
  return method ? labels[method] || 'GeniusPay' : 'GeniusPay';
}
