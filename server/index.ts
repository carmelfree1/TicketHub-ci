import 'dotenv/config';
import { createApp } from './app.js';
import { closeDatabase, initializeDatabase } from './db.js';

function validateProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;
  for (const name of ['TICKET_SIGNING_SECRET', 'GENIUSPAY_WEBHOOK_SECRET', 'GENIUSPAY_API_KEY', 'GENIUSPAY_API_SECRET']) {
    if (!process.env[name]) throw new Error(`${name} doit être configuré en production.`);
  }
  for (const name of ['TICKET_SIGNING_SECRET', 'GENIUSPAY_WEBHOOK_SECRET']) {
    if (process.env[name]!.length < 32) throw new Error(`${name} doit contenir au moins 32 caractères en production.`);
  }
  for (const name of ['APP_URL', 'WEB_ORIGIN']) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} doit être configuré en production.`);
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new Error(`${name} doit être une URL valide.`); }
    if (parsed.protocol !== 'https:') throw new Error(`${name} doit utiliser HTTPS en production.`);
  }
}

async function main() {
  validateProductionSecrets();
  await initializeDatabase();
  const port = Number(process.env.API_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT invalide.');
  }

  const app = createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`TicketHub CI API prête sur 0.0.0.0:${port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`${signal} reçu, arrêt du serveur…`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[startup]', error);
  process.exitCode = 1;
});
