import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

configureTestEnv();
const { signTicketQr, verifyTicketQr, createTicketCode } = await import('../../src/modules/tickets/qr.service.js');

const future = () => Math.floor(Date.now() / 1000) + 3600;
const claims = () => ({ v: 1 as const, ticketId: 'ticket-1', bookingId: 'booking-1', exp: future() });

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

test('round-trips signed claims', () => {
  const input = claims();
  assert.deepEqual(verifyTicketQr(signTicketQr(input)), input);
});

test('rejects a token whose payload was edited', () => {
  const [, signature] = signTicketQr(claims()).split('.');
  const edited = Buffer.from(JSON.stringify({ ...claims(), ticketId: 'ticket-2' })).toString('base64url');
  assert.equal(codeOf(() => verifyTicketQr(`${edited}.${signature}`)), 'INVALID_TICKET_SIGNATURE');
});

test('rejects a token signed with another key', () => {
  const payload = Buffer.from(JSON.stringify(claims())).toString('base64url');
  const forged = createHmac('sha256', 'attacker-key-attacker-key-attacker-key').update(payload).digest('base64url');
  assert.equal(codeOf(() => verifyTicketQr(`${payload}.${forged}`)), 'INVALID_TICKET_SIGNATURE');
});

test('rejects expired tokens', () => {
  const token = signTicketQr({ ...claims(), exp: Math.floor(Date.now() / 1000) - 1 });
  assert.equal(codeOf(() => verifyTicketQr(token)), 'TICKET_EXPIRED');
});

test('rejects malformed tokens', () => {
  const valid = signTicketQr(claims());
  const [payload, signature] = valid.split('.');
  for (const token of ['', 'abc', 'a.b', `${valid}.extra`, `.${signature}`, `${payload}.`]) {
    assert.equal(codeOf(() => verifyTicketQr(token)), 'INVALID_TICKET_TOKEN', token);
  }
});

test('rejects signed payloads with an unexpected shape', () => {
  const shapes = [
    { v: 2, ticketId: 't', bookingId: 'b', exp: future() },
    { v: 1, ticketId: 1, bookingId: 'b', exp: future() },
    { v: 1, ticketId: 't', bookingId: 'b', exp: 'soon' },
  ];
  for (const bad of shapes) {
    const payload = Buffer.from(JSON.stringify(bad)).toString('base64url');
    const signature = createHmac('sha256', process.env.TICKET_SIGNING_SECRET!).update(payload).digest('base64url');
    assert.equal(codeOf(() => verifyTicketQr(`${payload}.${signature}`)), 'INVALID_TICKET_TOKEN');
  }
});

test('generates distinct, well-formed ticket codes', () => {
  const codes = new Set(Array.from({ length: 500 }, createTicketCode));
  assert.equal(codes.size, 500);
  for (const code of codes) assert.match(code, /^TKH-[0-9A-F]{6}-[0-9A-F]{6}$/);
});
