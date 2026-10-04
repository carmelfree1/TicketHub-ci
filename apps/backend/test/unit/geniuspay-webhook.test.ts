import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

configureTestEnv();
const { verifyGeniusPayWebhook, parseGeniusPayWebhook } = await import('../../src/integrations/geniuspay/geniuspay.webhook.js');

const secret = process.env.GENIUSPAY_WEBHOOK_SECRET!;
const now = 1_800_000_000;
const body = Buffer.from(
  JSON.stringify({
    id: 'delivery-1',
    event: 'payment.success',
    data: { reference: 'ref-1', amount: 5000, currency: 'XOF', status: 'completed', metadata: { booking_id: 'booking-1' } },
  }),
);

function sign(timestamp: string, raw: Buffer, key = secret): string {
  return createHmac('sha256', key).update(`${timestamp}.`).update(raw).digest('hex');
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

test('accepts a correctly signed webhook inside the time window', () => {
  const timestamp = String(now);
  assert.doesNotThrow(() => verifyGeniusPayWebhook({ signature: sign(timestamp, body), timestamp, rawBody: body, nowSeconds: now }));
});

test('accepts a sha256= prefixed, upper-case signature', () => {
  const timestamp = String(now);
  const signature = `sha256=${sign(timestamp, body).toUpperCase()}`;
  assert.doesNotThrow(() => verifyGeniusPayWebhook({ signature, timestamp, rawBody: body, nowSeconds: now }));
});

test('rejects a signature made with another secret', () => {
  const timestamp = String(now);
  const signature = sign(timestamp, body, 'another-secret-that-is-long-enough-123456');
  assert.equal(codeOf(() => verifyGeniusPayWebhook({ signature, timestamp, rawBody: body, nowSeconds: now })), 'INVALID_WEBHOOK_SIGNATURE');
});

test('rejects a body altered after signing', () => {
  const timestamp = String(now);
  const signature = sign(timestamp, body);
  const tampered = Buffer.from(body.toString().replace('5000', '1'));
  assert.equal(codeOf(() => verifyGeniusPayWebhook({ signature, timestamp, rawBody: tampered, nowSeconds: now })), 'INVALID_WEBHOOK_SIGNATURE');
});

test('rejects a timestamp swapped after signing', () => {
  const signature = sign(String(now), body);
  assert.equal(codeOf(() => verifyGeniusPayWebhook({ signature, timestamp: String(now + 1), rawBody: body, nowSeconds: now })), 'INVALID_WEBHOOK_SIGNATURE');
});

test('rejects timestamps outside the 300 second window in both directions', () => {
  for (const offset of [-301, 301]) {
    const timestamp = String(now + offset);
    assert.equal(
      codeOf(() => verifyGeniusPayWebhook({ signature: sign(timestamp, body), timestamp, rawBody: body, nowSeconds: now })),
      'INVALID_WEBHOOK_SIGNATURE',
      `offset ${offset}`,
    );
  }
});

test('accepts timestamps exactly at the window boundary', () => {
  for (const offset of [-300, 300]) {
    const timestamp = String(now + offset);
    assert.doesNotThrow(() => verifyGeniusPayWebhook({ signature: sign(timestamp, body), timestamp, rawBody: body, nowSeconds: now }));
  }
});

test('rejects malformed signatures and timestamps', () => {
  const timestamp = String(now);
  for (const signature of ['', 'abc', 'z'.repeat(64), sign(timestamp, body).slice(2)]) {
    assert.equal(codeOf(() => verifyGeniusPayWebhook({ signature, timestamp, rawBody: body, nowSeconds: now })), 'INVALID_WEBHOOK_SIGNATURE');
  }
  for (const bad of ['', 'abc', '-1', '1.5', '1e9', String(Number.MAX_SAFE_INTEGER + 2)]) {
    assert.equal(
      codeOf(() => verifyGeniusPayWebhook({ signature: sign(bad, body), timestamp: bad, rawBody: body, nowSeconds: now })),
      'INVALID_WEBHOOK_SIGNATURE',
      `timestamp ${bad}`,
    );
  }
});

test('parses the fields the payment flow depends on', () => {
  const payload = parseGeniusPayWebhook(body);
  assert.equal(payload.id, 'delivery-1');
  assert.equal(payload.event, 'payment.success');
  assert.equal(payload.data.reference, 'ref-1');
  assert.equal(payload.data.metadata?.booking_id, 'booking-1');
});

test('rejects payloads with missing identifiers or invalid JSON', () => {
  const variants = [
    Buffer.from('not json'),
    Buffer.from('{}'),
    Buffer.from(JSON.stringify({ id: 'x', event: 'payment.success', data: { reference: 'r' } })),
    Buffer.from(JSON.stringify({ event: 'payment.success', data: { reference: 'r', metadata: { booking_id: 'b' } } })),
    Buffer.from(JSON.stringify({ id: 'x'.repeat(201), event: 'payment.success', data: { reference: 'r', metadata: { booking_id: 'b' } } })),
    Buffer.from(JSON.stringify({ id: 'x', event: 'e', data: { reference: 'r', metadata: { booking_id: 42 } } })),
  ];
  for (const raw of variants) {
    assert.equal(codeOf(() => parseGeniusPayWebhook(raw)), 'INVALID_WEBHOOK_BODY', raw.toString().slice(0, 40));
  }
});
