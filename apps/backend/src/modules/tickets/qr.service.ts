import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/AppError.js';
import type { TicketQrClaims } from './ticket.types.js';

export function createTicketCode(): string {
  const chunk = () => randomBytes(3).toString('hex').toUpperCase();
  return `TKH-${chunk()}-${chunk()}`;
}

export function signTicketQr(claims: TicketQrClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', env.TICKET_SIGNING_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyTicketQr(token: string): TicketQrClaims {
  const [payload, signature, ...extra] = token.split('.');
  if (!payload || !signature || extra.length || !/^[A-Za-z0-9_-]{43}$/.test(signature)) {
    throw new AppError('Jeton de billet invalide.', 401, 'INVALID_TICKET_TOKEN');
  }
  const expected = createHmac('sha256', env.TICKET_SIGNING_SECRET).update(payload).digest('base64url');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new AppError('Signature du billet invalide.', 401, 'INVALID_TICKET_SIGNATURE');
  }
  let claims: TicketQrClaims;
  try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TicketQrClaims; }
  catch { throw new AppError('Contenu du billet invalide.', 401, 'INVALID_TICKET_TOKEN'); }
  if (claims.v !== 1 || typeof claims.ticketId !== 'string' || typeof claims.bookingId !== 'string' || !Number.isSafeInteger(claims.exp)) {
    throw new AppError('Contenu du billet invalide.', 401, 'INVALID_TICKET_TOKEN');
  }
  if (claims.exp <= Math.floor(Date.now() / 1000)) throw new AppError('Ce billet a expiré.', 410, 'TICKET_EXPIRED');
  return claims;
}
