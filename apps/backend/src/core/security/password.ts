import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { BusinessError } from '../errors/BusinessError.js';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: unknown): Promise<string> {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new BusinessError('Le mot de passe doit contenir entre 10 et 128 caractères.', 'INVALID_PASSWORD', 400);
  }
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: unknown, encoded: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [algorithm, salt, digest, extra] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !digest || extra || !/^[a-f0-9]{128}$/i.test(digest)) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
