import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';

export async function sendSms(input: { to: string; template: string; payload: Record<string, unknown> }): Promise<void> {
  if (!env.SMS_PROVIDER_URL || !env.SMS_PROVIDER_API_KEY) throw new AppError('Le fournisseur SMS n’est pas configuré.', 503, 'SMS_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(env.SMS_PROVIDER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SMS_PROVIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new AppError(`Le fournisseur SMS a répondu ${response.status}.`, 502, 'SMS_PROVIDER_ERROR');
}
