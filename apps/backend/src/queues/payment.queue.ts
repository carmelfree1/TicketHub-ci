import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const paymentQueue = redisConnection ? new Queue('payment-reconciliation', { connection: redisConnection }) : null;
