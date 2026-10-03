import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';
import { logger } from '../core/logger/logger.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.PG_POOL_SIZE,
  ssl: env.PGSSL ? { rejectUnauthorized: true } : undefined,
  application_name: 'tickethub-api',
  statement_timeout: 10_000,
  idleTimeoutMillis: 30_000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('PostgreSQL connecté via Prisma');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

export { pool as postgresPool };
