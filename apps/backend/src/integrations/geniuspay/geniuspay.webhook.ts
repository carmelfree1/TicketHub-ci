import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';
import type { GeniusPayWebhookPayload } from './geniuspay.types.js';

export function verifyGeniusPayWebhook(input: { signature: string; timestamp: string; rawBody: Buffer; nowSeconds?: number }) {
  const secret = env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) throw new AppError('Le secret webhook GeniusPay n’est pas configuré.', 503, 'WEBHOOK_NOT_CONFIGURED');
  if (!/^\d+$/.test(input.timestamp)) throw new AppError('Horodatage webhook invalide.', 401, 'INVALID_WEBHOOK_SIGNATURE');
  const timestamp = Number(input.timestamp);
  if (!Number.isSafeInteger(timestamp) || Math.abs((input.nowSeconds ?? Math.floor(Date.now() / 1000)) - timestamp) > 300) {
    throw new AppError('Webhook hors de la fenêtre de validité.', 401, 'INVALID_WEBHOOK_SIGNATURE');
  }
  const provided = input.signature.replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided)) throw new AppError('Signature webhook invalide.', 401, 'INVALID_WEBHOOK_SIGNATURE');
  const expected = createHmac('sha256', secret).update(`${input.timestamp}.`).update(input.rawBody).digest('hex');
  const actualBytes = Buffer.from(provided, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  if (!timingSafeEqual(actualBytes, expectedBytes)) throw new AppError('Signature webhook invalide.', 401, 'INVALID_WEBHOOK_SIGNATURE');
}

export function parseGeniusPayWebhook(rawBody: Buffer): GeniusPayWebhookPayload & { id: string; event: string; data: NonNullable<GeniusPayWebhookPayload['data']> } {
  let payload: GeniusPayWebhookPayload;
  try { payload = JSON.parse(rawBody.toString('utf8')) as GeniusPayWebhookPayload; }
  catch { throw new AppError('Corps webhook JSON invalide.', 400, 'INVALID_WEBHOOK_BODY'); }
  const bookingId = payload.data?.metadata?.booking_id;
  if (!payload.id || payload.id.length > 200 || !payload.event || payload.event.length > 100 ||
    !payload.data?.reference || payload.data.reference.length > 160 ||
    typeof bookingId !== 'string' || !bookingId || bookingId.length > 100) {
    throw new AppError('Identifiants webhook manquants ou invalides.', 400, 'INVALID_WEBHOOK_BODY');
  }
  return payload as GeniusPayWebhookPayload & { id: string; event: string; data: NonNullable<GeniusPayWebhookPayload['data']> };
}
