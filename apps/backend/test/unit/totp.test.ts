import assert from 'node:assert/strict';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

configureTestEnv();
const { base32Decode, base32Encode, generateTotpSecret, otpauthUri, totpAt, totpStep, verifyTotp } = await import('../../src/core/security/totp.js');
const { signMfaChallenge, verifyMfaChallenge } = await import('../../src/core/security/mfa-challenge.js');

// RFC 6238 appendix B secret "12345678901234567890" (the 6 digit tail of the published 8 digit SHA-1 values).
const rfcSecret = base32Encode(Buffer.from('12345678901234567890'));

test('base32 round-trips and matches RFC 4648 vectors', () => {
  assert.equal(base32Encode(Buffer.from('foobar')), 'MZXW6YTBOI');
  assert.equal(base32Decode('MZXW6YTBOI').toString(), 'foobar');
  const random = Buffer.from(Array.from({ length: 20 }, (_, index) => (index * 37) % 256));
  assert.deepEqual(base32Decode(base32Encode(random)), random);
  assert.throws(() => base32Decode('not*valid'));
});

test('matches the RFC 6238 SHA-1 test vectors', () => {
  const vectors: Array<[number, string]> = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ];
  for (const [seconds, expected] of vectors) {
    assert.equal(totpAt(rfcSecret, totpStep(seconds * 1000)), expected, `t=${seconds}`);
  }
});

test('verifyTotp accepts neighbouring steps only inside the window', () => {
  const now = 1_700_000_000_000;
  const step = totpStep(now);
  assert.equal(verifyTotp(rfcSecret, totpAt(rfcSecret, step), { timeMs: now }), step);
  assert.equal(verifyTotp(rfcSecret, totpAt(rfcSecret, step - 1), { timeMs: now }), step - 1);
  assert.equal(verifyTotp(rfcSecret, totpAt(rfcSecret, step + 1), { timeMs: now }), step + 1);
  assert.equal(verifyTotp(rfcSecret, totpAt(rfcSecret, step + 2), { timeMs: now }), null);
  assert.equal(verifyTotp(rfcSecret, totpAt(rfcSecret, step - 2), { timeMs: now }), null);
});

test('verifyTotp rejects malformed codes', () => {
  const now = 1_700_000_000_000;
  for (const code of ['', '12345', '1234567', 'abcdef', '12 456', '１２３４５６']) {
    assert.equal(verifyTotp(rfcSecret, code, { timeMs: now }), null, code);
  }
});

test('generated secrets are 160 bit, unique and usable', () => {
  const first = generateTotpSecret();
  assert.match(first, /^[A-Z2-7]{32}$/);
  assert.notEqual(first, generateTotpSecret());
  assert.equal(verifyTotp(first, totpAt(first, totpStep())) !== null, true);
});

test('otpauth URI carries the parameters authenticator apps need', () => {
  const uri = new URL(otpauthUri({ secret: rfcSecret, accountName: '+2250700000000', issuer: 'TicketHub CI' }));
  assert.equal(uri.protocol, 'otpauth:');
  assert.equal(uri.host, 'totp');
  assert.equal(uri.searchParams.get('secret'), rfcSecret);
  assert.equal(uri.searchParams.get('issuer'), 'TicketHub CI');
  assert.equal(uri.searchParams.get('digits'), '6');
  assert.equal(uri.searchParams.get('period'), '30');
});

test('MFA challenge tokens round-trip and reject tampering', () => {
  const token = signMfaChallenge('user-1');
  assert.deepEqual(verifyMfaChallenge(token), { userId: 'user-1' });
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'user-2', purpose: 'mfa', exp: 4_102_444_800 })).toString('base64url');
  for (const bad of ['', 'abc', `${payload}.`, `${forged}.${signature}`, `${token}.x`]) {
    assert.throws(() => verifyMfaChallenge(bad), (error: { code?: string }) => error.code === 'MFA_CHALLENGE_INVALID', bad);
  }
});

test('a session token is never accepted as an MFA challenge', async () => {
  const { signJwt } = await import('../../src/core/security/jwt.js');
  const { token } = signJwt({ sub: 'user-1', role: 'partner', expiresInSeconds: 300 });
  assert.throws(() => verifyMfaChallenge(token), (error: { code?: string }) => error.code === 'MFA_CHALLENGE_INVALID');
});
