import './load-env.js';
import { createServer } from 'node:http';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { logger } from './core/logger/logger.js';
import { startJobs, stopJobs } from './jobs/index.js';
import { createApp } from './app.js';

const app = createApp();
const server = createServer(app);
let shuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Arrêt du serveur en cours');
  const forceClose = setTimeout(() => {
    logger.error('Délai d’arrêt dépassé; fermeture forcée');
    process.exit(1);
  }, 10_000);
  forceClose.unref();

  try {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeIdleConnections?.();
      });
    }
    await stopJobs();
    await disconnectRedis();
    await disconnectDatabase();
    clearTimeout(forceClose);
    logger.info('Serveur arrêté proprement');
    process.exitCode = exitCode;
  } catch (error) {
    logger.error({ err: error }, 'Erreur pendant l’arrêt');
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  await connectDatabase();
  await connectRedis();
  await startJobs();

  server.on('error', (error) => {
    logger.fatal({ err: error }, 'Impossible de démarrer le serveur HTTP');
    process.exitCode = 1;
    void shutdown('server-error', 1);
  });
  server.listen(env.API_PORT, '0.0.0.0', () => {
    logger.info({ port: env.API_PORT, environment: env.NODE_ENV }, 'API TicketHub prête');
  });
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

main().catch(async (error: unknown) => {
  logger.fatal({ err: error }, 'Démarrage de l’API impossible');
  try {
    await stopJobs();
    await disconnectRedis();
    await disconnectDatabase();
  } catch (cleanupError) {
    logger.error({ err: cleanupError }, 'Nettoyage après échec de démarrage');
  }
  process.exitCode = 1;
});
