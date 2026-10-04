import IORedis from 'ioredis';
import { env } from './env.js';
import { logger } from '../core/logger/logger.js';

export const redisConnection = env.REDIS_URL
  ? new IORedis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null, enableReadyCheck: true })
  : null;

function waitUntilReady(connection: IORedis, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Redis ne répond pas.')), timeoutMs);
    connection.once('ready', () => { clearTimeout(timer); resolve(); });
    connection.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
}

export async function connectRedis(): Promise<void> {
  if (!redisConnection) {
    logger.warn('REDIS_URL absent : les tâches asynchrones sont désactivées.');
    return;
  }
  // BullMQ queues created at import time already start a lazy connection; connecting a second time throws.
  if (redisConnection.status === 'wait') await redisConnection.connect();
  else if (redisConnection.status !== 'ready') await waitUntilReady(redisConnection);
  await redisConnection.ping();
  logger.info('Redis connecté');
}

export async function disconnectRedis(): Promise<void> {
  if (redisConnection && redisConnection.status !== 'end') await redisConnection.quit();
}
