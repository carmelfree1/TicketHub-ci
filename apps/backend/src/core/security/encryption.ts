import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

function keyBytes(): Buffer {
  if (!env.DATA_ENCRYPTION_KEY) throw new AppError('DATA_ENCRYPTION_KEY n’est pas configurée.', 503, 'ENCRYPTION_NOT_CONFIGURED');
  return Buffer.from(env.DATA_ENCRYPTION_KEY, 'hex');
}

export function encryptSensitiveValue(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptSensitiveValue(value: string): string {
  const [ivPart, tagPart, cipherPart, extra] = value.split('.');
  if (!ivPart || !tagPart || !cipherPart || extra) throw new AppError('Valeur chiffrée invalide.', 400, 'INVALID_CIPHERTEXT');
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(cipherPart, 'base64url')), decipher.final()]).toString('utf8');
}
