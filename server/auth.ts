import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import { pool } from './db.js';
import { DomainError, normalizeCiPhone } from './domain.js';
import type { AuthUser, UserRole } from './types.js';

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'tickethub_session';
const SESSION_TTL_DAYS = 14;

export function normalizePhone(value: unknown): string {
  return normalizeCiPhone(value);
}

export async function hashPassword(password: unknown): Promise<string> {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new DomainError('Le mot de passe doit contenir entre 10 et 128 caractères.', 400, 'INVALID_PASSWORD');
  }
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: unknown, encoded: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [algorithm, salt, storedHex, extra] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedHex || extra) return false;

  let stored: Buffer;
  try {
    stored = Buffer.from(storedHex, 'hex');
  } catch {
    return false;
  }
  const candidate = (await scrypt(password, salt, stored.length)) as Buffer;
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function digestSession(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return valueParts.join('=');
  }
  return undefined;
}

function sessionCookie(rawToken: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export async function issueSession(userId: string, response: Response): Promise<void> {
  const rawToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [digestSession(rawToken), userId, expiresAt.toISOString()],
  );
  response.setHeader('Set-Cookie', sessionCookie(rawToken, SESSION_TTL_DAYS * 24 * 60 * 60));
}

export async function destroySession(request: Request, response: Response): Promise<void> {
  const rawToken = getCookie(request.headers.cookie, SESSION_COOKIE);
  if (rawToken) {
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [digestSession(rawToken)]);
  }
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function authMiddleware(request: Request, response: Response, next: NextFunction): Promise<void> {
  const rawToken = getCookie(request.headers.cookie, SESSION_COOKIE);
  if (!rawToken) {
    next();
    return;
  }

  try {
    const tokenHash = digestSession(rawToken);
    const { rows } = await pool.query<{
      id: string;
      full_name: string;
      phone: string;
      role: UserRole;
    }>(
      `SELECT u.id, u.full_name, u.phone, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash],
    );
    if (rows[0]) {
      const user: AuthUser = {
        id: rows[0].id,
        fullName: rows[0].full_name,
        phone: rows[0].phone,
        role: rows[0].role,
      };
      request.authUser = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  if (!request.authUser) {
    next(new DomainError('Connectez-vous pour continuer.', 401, 'AUTH_REQUIRED'));
    return;
  }
  next();
}

export function requireRole(role: UserRole) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.authUser) {
      next(new DomainError('Connectez-vous pour continuer.', 401, 'AUTH_REQUIRED'));
      return;
    }
    if (request.authUser.role !== role) {
      next(new DomainError('Accès réservé au partenaire authentifié.', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
