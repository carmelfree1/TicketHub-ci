import assert from 'node:assert/strict';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

configureTestEnv();
const { renderNotification, shortReference } = await import('../../src/modules/notifications/notification.templates.js');
const { outcomeForStatus, outcomeForWebhook } = await import('../../src/modules/payments/payment-outcome.js');

test('short references are compact, uppercase and free of separators', () => {
  assert.equal(shortReference('3f2a9c1e-77bd-4c11-9f3a-0123456789ab'), '3F2A9C1E');
  assert.equal(shortReference('x-y_z'), 'XYZ');
});

test('every message carries the booking reference and no ticket secret', () => {
  for (const template of ['payment_confirmed', 'payment_under_review', 'payment_failed', 'refund_completed'] as const) {
    const message = renderNotification(template, { reference: 'AB12CD34', quantity: 2, amountXof: 10_000 });
    assert.ok(message.includes('AB12CD34'), template);
    assert.ok(message.startsWith('TicketHub CI'), template);
    assert.doesNotMatch(message, /TKH-|https?:|qr/i, `${template} must not leak a ticket code or link`);
    assert.ok(message.length < 320, `${template} should stay within two SMS segments`);
  }
});

test('the confirmation agrees in number and shows the amount', () => {
  assert.match(renderNotification('payment_confirmed', { reference: 'R', quantity: 1, amountXof: 5000 }), /Vos 1 billet est disponible/);
  assert.match(renderNotification('payment_confirmed', { reference: 'R', quantity: 3, amountXof: 15_000 }), /Vos 3 billets sont disponibles/);
  assert.match(renderNotification('payment_confirmed', { reference: 'R', quantity: 3, amountXof: 15_000 }), /15.000 FCFA|15\s?000 FCFA/);
});

test('maps gateway webhook events and lookup statuses to outcomes', () => {
  assert.equal(outcomeForWebhook('payment.success', 'completed'), 'success');
  assert.equal(outcomeForWebhook('payment.success', 'pending'), null, 'a success event that is not completed is not a success');
  assert.equal(outcomeForWebhook('payment.failed', 'failed'), 'failed');
  assert.equal(outcomeForWebhook('payment.cancelled', undefined), 'cancelled');
  assert.equal(outcomeForWebhook('payment.expired', undefined), 'expired');
  assert.equal(outcomeForWebhook('payment.refunded', undefined), 'refunded');
  assert.equal(outcomeForWebhook('payment.initiated', undefined), null);
  assert.equal(outcomeForWebhook('cashout.completed', undefined), null);

  assert.equal(outcomeForStatus('completed'), 'success');
  assert.equal(outcomeForStatus('failed'), 'failed');
  assert.equal(outcomeForStatus('expired'), 'expired');
  assert.equal(outcomeForStatus('pending'), null);
  assert.equal(outcomeForStatus('processing'), null);
  assert.equal(outcomeForStatus('something-new'), null);
});
