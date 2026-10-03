import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';

export async function sendEmail(input: { to: string; template: string; payload: Record<string, unknown> }): Promise<void> {
  if (!env.EMAIL_PROVIDER_URL || !env.EMAIL_PROVIDER_API_KEY) throw new AppError('Le fournisseur email n’est pas configuré.', 503, 'EMAIL_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(env.EMAIL_PROVIDER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new AppError(`Le fournisseur email a répondu ${response.status}.`, 502, 'EMAIL_PROVIDER_ERROR');
}
