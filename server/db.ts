import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { seedDatabase } from './seed.js';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_SIZE ?? 10),
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
  statement_timeout: 10_000,
  idleTimeoutMillis: 30_000,
});

export async function initializeDatabase(): Promise<void> {
  if (!connectionString) {
    throw new Error('DATABASE_URL manquant. Copiez .env.example vers .env et configurez PostgreSQL.');
  }

  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  await seedDatabase(pool);
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
