import IORedis from 'ioredis';
import { env } from './env.js';
import { logger } from '../core/logger/logger.js';

export const redisConnection = env.REDIS_URL
  ? new IORedis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null, enableReadyCheck: true })
  : null;

export async function connectRedis(): Promise<void> {
  if (!redisConnection) {
    logger.warn('REDIS_URL absent : les tâches asynchrones sont désactivées.');
    return;
  }
  await redisConnection.connect();
  await redisConnection.ping();
  logger.info('Redis connecté');
}

export async function disconnectRedis(): Promise<void> {
  if (redisConnection && redisConnection.status !== 'end') await redisConnection.quit();
}
