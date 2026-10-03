import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  DomainError,
  makeTicketCode,
  normalizeCiPhone,
  signTicket,
  validateQuantity,
  validateSeats,
  verifyGeniusPaySignature,
  verifyTicket,
} from '../domain.js';

function expectDomainError(action: () => unknown, code: string) {
  assert.throws(action, (error: unknown) => error instanceof DomainError && error.code === code);
}

test('seat selection is unique, sorted and bounded', () => {
  assert.deepEqual(validateSeats([14, 2, 3]), [2, 3, 14]);
  expectDomainError(() => validateSeats([]), 'INVALID_SEATS');
  expectDomainError(() => validateSeats([1, 1]), 'INVALID_SEATS');
  expectDomainError(() => validateSeats([42]), 'INVALID_SEATS');
  expectDomainError(() => validateSeats([1, 2, 3, 4, 5]), 'INVALID_SEATS');
});

test('event quantities are bounded', () => {
  assert.equal(validateQuantity(4), 4);
  expectDomainError(() => validateQuantity(0), 'INVALID_QUANTITY');
  expectDomainError(() => validateQuantity(11), 'INVALID_QUANTITY');
  expectDomainError(() => validateQuantity(1.2), 'INVALID_QUANTITY');
});

test('Ivorian phone numbers normalize to international format', () => {
  assert.equal(normalizeCiPhone('07 88 45 12 30'), '+2250788451230');
  assert.equal(normalizeCiPhone('+225 07 88 45 12 30'), '+2250788451230');
  expectDomainError(() => normalizeCiPhone('12345'), 'INVALID_PHONE');
});

test('ticket QR token is signed, bound to a booking and expires', () => {
  const secret = 'test-ticket-secret-at-least-32-chars';
  const claims = { v: 1 as const, ticketId: 'ticket-1', bookingId: 'booking-1', exp: 2_000_000_000 };
  const token = signTicket(claims, secret);
  assert.deepEqual(verifyTicket(token, secret, 1_900_000_000), claims);
  expectDomainError(() => verifyTicket(`${token.slice(0, -1)}x`, secret, 1_900_000_000), 'INVALID_TICKET_SIGNATURE');
  expectDomainError(() => verifyTicket(token, secret, 2_000_000_001), 'TICKET_EXPIRED');
});

test('ticket codes use random non-repeating segments in the expected format', () => {
  assert.match(makeTicketCode(), /^TKH-[0-9A-F]{6}-[0-9A-F]{6}$/);
});

test('GeniusPay webhook signatures require a valid HMAC and a fresh timestamp', () => {
  const secret = 'test-webhook-secret';
  const timestamp = '1900000000';
  const rawBody = Buffer.from('{"event":"payment.success"}');
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
  assert.equal(verifyGeniusPaySignature({
    secret,
    timestamp,
    signature,
    rawBody,
    nowSeconds: 1_900_000_010,
  }), true);
  assert.equal(verifyGeniusPaySignature({
    secret,
    timestamp,
    signature: '0'.repeat(64),
    rawBody,
    nowSeconds: 1_900_000_010,
  }), false);
  assert.equal(verifyGeniusPaySignature({
    secret,
    timestamp,
    signature,
    rawBody,
    nowSeconds: 1_900_000_400,
  }), false);
});
