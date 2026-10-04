import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

const CHALLENGE_TTL_SECONDS = 5 * 60;

// A distinct key per purpose guarantees a challenge token can never be accepted as a session token.
const key = () => createHmac('sha256', env.JWT_SECRET).update('tickethub:mfa-challenge:v1').digest();

export function signMfaChallenge(userId: string): string {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    purpose: 'mfa',
    exp: Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS,
    jti: randomUUID(),
  })).toString('base64url');
  return `${payload}.${createHmac('sha256', key()).update(payload).digest('base64url')}`;
}

export function verifyMfaChallenge(token: string): { userId: string } {
  const [payload, signature, extra] = token.split('.');
  const invalid = () => new AppError('La vérification a expiré. Reconnectez-vous.', 401, 'MFA_CHALLENGE_INVALID');
  if (!payload || !signature || extra) throw invalid();
  const expected = createHmac('sha256', key()).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw invalid();
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown; purpose?: unknown; exp?: unknown };
    if (claims.purpose !== 'mfa' || typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || claims.exp <= Date.now() / 1000) throw invalid();
    return { userId: claims.sub };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalid();
  }
}
