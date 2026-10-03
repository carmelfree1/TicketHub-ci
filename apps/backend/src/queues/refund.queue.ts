import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const refundQueue = redisConnection ? new Queue('refunds', { connection: redisConnection }) : null;
