import assert from 'node:assert/strict';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

configureTestEnv();
const { computeCommission, selectCommissionRule } = await import('../../src/modules/orders/commission.service.js');

const rule = (overrides: Partial<Parameters<typeof selectCommissionRule>[0][number]> & { rateBps: number }) => ({
  providerId: null,
  productType: null,
  minXof: null,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

test('prefers provider and product type, then provider, then product type, then platform wide', () => {
  const rules = [
    rule({ rateBps: 100 }),
    rule({ rateBps: 200, productType: 'transport' }),
    rule({ rateBps: 300, providerId: 'p1' }),
    rule({ rateBps: 400, providerId: 'p1', productType: 'transport' }),
    rule({ rateBps: 500, providerId: 'p2', productType: 'transport' }),
  ];
  assert.equal(selectCommissionRule(rules, 'p1', 'transport')?.rateBps, 400);
  assert.equal(selectCommissionRule(rules, 'p1', 'event')?.rateBps, 300);
  assert.equal(selectCommissionRule(rules, 'p3', 'transport')?.rateBps, 200);
  assert.equal(selectCommissionRule(rules, 'p3', 'event')?.rateBps, 100);
});

test('ignores rules that belong to another provider or product type', () => {
  const rules = [rule({ rateBps: 500, providerId: 'p2' }), rule({ rateBps: 700, productType: 'event' })];
  assert.equal(selectCommissionRule(rules, 'p1', 'transport'), null);
});

test('the newest rule wins between equally specific ones', () => {
  const rules = [rule({ rateBps: 100, createdAt: new Date('2026-01-01') }), rule({ rateBps: 150, createdAt: new Date('2026-06-01') })];
  assert.equal(selectCommissionRule(rules, 'p1', 'event')?.rateBps, 150);
});

test('rounds down to a whole franc and falls back to the platform default without a rule', () => {
  assert.deepEqual(computeCommission(10_000, { rateBps: 250, minXof: null }, 0), { bps: 250, xof: 250 });
  assert.deepEqual(computeCommission(999, { rateBps: 250, minXof: null }, 0), { bps: 250, xof: 24 });
  assert.deepEqual(computeCommission(10_000, null, 300), { bps: 300, xof: 300 });
  assert.deepEqual(computeCommission(10_000, null, 0), { bps: 0, xof: 0 });
});

test('applies a minimum but never charges more than the amount paid', () => {
  assert.equal(computeCommission(1_000, { rateBps: 100, minXof: 200 }, 0).xof, 200);
  assert.equal(computeCommission(150, { rateBps: 100, minXof: 200 }, 0).xof, 150);
  assert.equal(computeCommission(10_000, { rateBps: 10_000, minXof: null }, 0).xof, 10_000);
  assert.equal(computeCommission(0, { rateBps: 500, minXof: 100 }, 0).xof, 0);
});
