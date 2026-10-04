import assert from 'node:assert/strict';
import test from 'node:test';
import { configureTestEnv } from '../helpers/test-env.js';

const redisUrl = process.env.TEST_REDIS_URL;

// Production requires Redis, and the API creates its queues while modules load, before connectRedis() runs.
// A previous version crashed on start-up with "Redis is already connecting" in exactly that order.
test('the API connects to Redis after its queues were created, and can enqueue and read a job', { skip: !redisUrl, timeout: 30_000 }, async () => {
  configureTestEnv();
  process.env.REDIS_URL = redisUrl;
  const queues = await import('../../src/queues/index.js');
  const redis = await import('../../src/config/redis.js');
  const queue = queues.notificationQueue;
  assert.ok(queue, 'the notification queue exists when REDIS_URL is set');
  try {
    await redis.connectRedis();
    await redis.connectRedis();
    assert.equal(redis.redisConnection?.status, 'ready');
    const job = await queue.add('deliver', { notificationId: `redis-test-${Date.now()}` }, { removeOnComplete: true });
    const stored = await queue.getJob(job.id!);
    assert.equal(stored?.name, 'deliver');
    await stored?.remove();
  } finally {
    await queues.closeQueues();
    await redis.disconnectRedis();
  }
});
