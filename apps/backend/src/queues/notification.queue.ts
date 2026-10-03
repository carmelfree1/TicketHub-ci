import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const notificationQueue = redisConnection ? new Queue('notifications', { connection: redisConnection }) : null;
