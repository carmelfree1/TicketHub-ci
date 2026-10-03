import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

export type UserRole = 'traveler' | 'partner';
export interface JwtClaims {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti: string;
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function signJwt(input: { sub: string; role: UserRole; expiresInSeconds: number }): { token: string; claims: JwtClaims } {
  const now = Math.floor(Date.now() / 1000);
  const claims: JwtClaims = {
    sub: input.sub,
    role: input.role,
    iat: now,
    exp: now + input.expiresInSeconds,
    jti: randomUUID(),
  };
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode(claims);
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', env.JWT_SECRET).update(signingInput).digest('base64url');
  return { token: `${signingInput}.${signature}`, claims };
}

export function verifyJwt(token: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) throw new AppError('Jeton de session invalide.', 401, 'INVALID_TOKEN');
  const [headerPart, payloadPart, signature] = parts;
  const expected = createHmac('sha256', env.JWT_SECRET).update(`${headerPart}.${payloadPart}`).digest('base64url');
  const actualBytes = Buffer.from(signature, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw new AppError('Signature de session invalide.', 401, 'INVALID_TOKEN_SIGNATURE');
  }

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as { alg?: string; typ?: string };
    const claims = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as Partial<JwtClaims>;
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || typeof claims.sub !== 'string' || !claims.sub ||
      (claims.role !== 'traveler' && claims.role !== 'partner') || typeof claims.jti !== 'string' ||
      !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat)) {
      throw new Error('Claims invalides');
    }
    if (claims.exp! <= Math.floor(Date.now() / 1000)) throw new AppError('La session a expiré.', 401, 'SESSION_EXPIRED');
    return claims as JwtClaims;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Contenu du jeton invalide.', 401, 'INVALID_TOKEN');
  }
}
