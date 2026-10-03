import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type ProductType = 'transport' | 'event';

export class DomainError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'INVALID_REQUEST') {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.code = code;
  }
}

export function validateSeats(value: unknown, capacity = 41): number[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw new DomainError('Choisissez entre 1 et 4 sièges.', 400, 'INVALID_SEATS');
  }

  const seats = value.map(Number);
  if (
    seats.some((seat) => !Number.isSafeInteger(seat) || seat < 1 || seat > capacity) ||
    new Set(seats).size !== seats.length
  ) {
    throw new DomainError('La sélection de sièges est invalide.', 400, 'INVALID_SEATS');
  }

  return seats.sort((a, b) => a - b);
}

export function validateQuantity(value: unknown, max = 10): number {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > max) {
    throw new DomainError(`La quantité doit être comprise entre 1 et ${max}.`, 400, 'INVALID_QUANTITY');
  }
  return quantity;
}

export function normalizeCiPhone(value: unknown): string {
  if (typeof value !== 'string') {
    throw new DomainError('Saisissez un numéro de téléphone.', 400, 'INVALID_PHONE');
  }

  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('225') ? digits.slice(3) : digits;
  if (!/^0[0-9]{9}$/.test(national)) {
    throw new DomainError('Numéro ivoirien invalide (format attendu : 07 00 00 00 00).', 400, 'INVALID_PHONE');
  }

  return `+225${national}`;
}

export function makeTicketCode(): string {
  const part = () => randomBytes(3).toString('hex').toUpperCase();
  return `TKH-${part()}-${part()}`;
}

export interface TicketClaims {
  v: 1;
  ticketId: string;
  bookingId: string;
  exp: number;
}

export function signTicket(claims: TicketClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyTicket(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): TicketClaims {
  const [payload, signature, ...extra] = token.split('.');
  if (!payload || !signature || extra.length > 0) {
    throw new DomainError('Jeton de billet invalide.', 401, 'INVALID_TICKET_TOKEN');
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) {
    throw new DomainError('Jeton de billet invalide.', 401, 'INVALID_TICKET_TOKEN');
  }
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new DomainError('Signature du billet invalide.', 401, 'INVALID_TICKET_SIGNATURE');
  }

  let claims: TicketClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TicketClaims;
  } catch {
    throw new DomainError('Contenu du billet invalide.', 401, 'INVALID_TICKET_TOKEN');
  }
  if (
    claims.v !== 1 ||
    typeof claims.ticketId !== 'string' ||
    typeof claims.bookingId !== 'string' ||
    !Number.isSafeInteger(claims.exp)
  ) {
    throw new DomainError('Contenu du billet invalide.', 401, 'INVALID_TICKET_TOKEN');
  }
  if (claims.exp < nowSeconds) {
    throw new DomainError('Ce billet a expiré.', 410, 'TICKET_EXPIRED');
  }
  return claims;
}

export interface WebhookSignatureInput {
  secret: string;
  timestamp: string;
  signature: string;
  rawBody: Buffer;
  nowSeconds?: number;
  toleranceSeconds?: number;
}

export function verifyGeniusPaySignature({
  secret,
  timestamp,
  signature,
  rawBody,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
}: WebhookSignatureInput): boolean {
  if (!secret || !/^\d+$/.test(timestamp) || !signature) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isSafeInteger(timestampNumber) || Math.abs(nowSeconds - timestampNumber) > toleranceSeconds) {
    return false;
  }

  const provided = signature.replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest('hex');
  const providedBuffer = Buffer.from(provided, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
