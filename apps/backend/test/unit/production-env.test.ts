import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

configureTestEnv();
const { parseEnv } = await import('../../src/config/env.js');

const secret = () => randomBytes(32).toString('hex');

/** A configuration that is valid in production; each test breaks exactly one thing. */
function production(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app:Str0ngPw@db.internal:5432/tickethub',
    REDIS_URL: 'redis://cache.internal:6379',
    APP_URL: 'https://tickethub.example',
    WEB_ORIGIN: 'https://tickethub.example',
    JWT_SECRET: secret(),
    TICKET_SIGNING_SECRET: secret(),
    DATA_ENCRYPTION_KEY: secret(),
    GENIUSPAY_API_KEY: 'pk_live_abcdef',
    GENIUSPAY_API_SECRET: 'sk_live_abcdef',
    GENIUSPAY_WEBHOOK_SECRET: secret(),
    ...overrides,
  };
}

const problems = (source: Record<string, string | undefined>): string[] => {
  try {
    parseEnv(source);
    return [];
  } catch (error) {
    return (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues.map((issue) => issue.path.join('.'));
  }
};

test('a complete production configuration is accepted', () => {
  assert.deepEqual(problems(production()), []);
});

test('production requires its infrastructure and the payment credentials', () => {
  for (const name of ['REDIS_URL', 'GENIUSPAY_API_KEY', 'GENIUSPAY_API_SECRET', 'GENIUSPAY_WEBHOOK_SECRET', 'DATA_ENCRYPTION_KEY']) {
    assert.ok(problems(production({ [name]: undefined })).includes(name), name);
  }
});

test('production requires https addresses', () => {
  assert.ok(problems(production({ APP_URL: 'http://tickethub.example' })).includes('APP_URL'));
  assert.ok(problems(production({ WEB_ORIGIN: 'http://tickethub.example' })).includes('APP_URL'));
});

test('example and development secrets are refused', () => {
  for (const name of ['JWT_SECRET', 'TICKET_SIGNING_SECRET', 'GENIUSPAY_WEBHOOK_SECRET']) {
    assert.ok(problems(production({ [name]: 'development-only-change-this-jwt-secret-before-deploy' })).includes(name), name);
  }
});

test('the session and ticket secrets must be different', () => {
  const same = secret();
  assert.ok(problems(production({ JWT_SECRET: same, TICKET_SIGNING_SECRET: same })).includes('TICKET_SIGNING_SECRET'));
});

test('sandbox or mock payment keys are refused in production but fine elsewhere', () => {
  assert.ok(problems(production({ GENIUSPAY_API_KEY: 'pk_sandbox_abc' })).includes('GENIUSPAY_API_KEY'));
  assert.ok(problems(production({ GENIUSPAY_API_SECRET: 'mock-secret' })).includes('GENIUSPAY_API_SECRET'));
  assert.deepEqual(problems({ ...production({ GENIUSPAY_API_KEY: 'pk_sandbox_abc', GENIUSPAY_API_SECRET: 'sk_sandbox_abc' }), NODE_ENV: 'development' }), []);
});

test('the development database credentials are refused in production', () => {
  assert.ok(problems(production({ DATABASE_URL: 'postgresql://tickethub:tickethub@localhost:5432/tickethub' })).includes('DATABASE_URL'));
});

test('weak or malformed secrets are refused everywhere', () => {
  assert.ok(problems(production({ JWT_SECRET: 'short' })).includes('JWT_SECRET'));
  assert.ok(problems(production({ DATA_ENCRYPTION_KEY: 'not-hex' })).includes('DATA_ENCRYPTION_KEY'));
});
