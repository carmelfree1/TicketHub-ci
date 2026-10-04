import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
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

export type DbTransaction = Prisma.TransactionClient;

const MAX_SERIALIZATION_RETRIES = 4;

export function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034') return true;
    if (error.code === 'P2010' && (error.meta as { code?: string } | undefined)?.code === '40001') return true;
  }
  return error instanceof Error && error.message.includes('could not serialize access');
}

/**
 * Runs a transaction and transparently retries it when PostgreSQL aborts it with a serialization
 * failure (SQLSTATE 40001), which is the expected outcome of losing a race at SERIALIZABLE isolation.
 * Only use it with callbacks whose effects are entirely inside the transaction.
 */
export async function transaction<T>(
  run: (tx: DbTransaction) => Promise<T>,
  options?: { isolationLevel?: Prisma.TransactionIsolationLevel; maxWait?: number; timeout?: number },
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(run, options);
    } catch (error) {
      if (!isSerializationFailure(error) || attempt >= MAX_SERIALIZATION_RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt + Math.floor(Math.random() * 30)));
    }
  }
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('PostgreSQL connecté via Prisma');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

/**
 * Runs `work` only if no other API instance currently holds the same named lock (PostgreSQL session advisory lock).
 * Scheduled jobs use it so that running several API instances does not multiply provider calls or notifications.
 * Returns undefined when the lock is taken elsewhere.
 */
export async function withAdvisoryLock<T>(name: string, work: () => Promise<T>): Promise<T | undefined> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [`tickethub:${name}`]);
    if (!rows[0]?.locked) return undefined;
    try {
      return await work();
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`tickethub:${name}`]);
    }
  } finally {
    client.release();
  }
}

export { pool as postgresPool };
