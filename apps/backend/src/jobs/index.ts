import { Worker } from 'bullmq';
import { withAdvisoryLock } from '../config/database.js';
import { env } from '../config/env.js';
import { redisConnection } from '../config/redis.js';
import { logger } from '../core/logger/logger.js';
import { expireReservationsJob } from './reservations/expire-reservations.job.js';
import { expireOrdersJob } from './orders/expire-orders.job.js';
import { reconcilePaymentsJob } from './payments/reconcile-payments.job.js';
import { processRefundReviewJob } from './refunds/process-refunds.job.js';
import { sendNotificationJob, sendPendingNotificationsJob } from './notifications/send-notifications.job.js';
import { generateDailySettlementsJob } from './settlements/generate-settlements.job.js';
import { closeQueues, notificationQueue, paymentQueue, refundQueue } from '../queues/index.js';

const timers: NodeJS.Timeout[] = [];
const workers: Worker[] = [];
let jobsStarted = false;

/** Runs a job on this instance only if no other instance is running the same one right now. */
async function safelyRun(label: string, work: () => Promise<unknown>): Promise<void> {
  try {
    const outcome = await withAdvisoryLock(label, async () => ({ result: await work() }));
    if (outcome) logger.info({ result: outcome.result }, `${label} terminé`);
  } catch (error) {
    logger.error({ err: error }, `${label} échoué`);
  }
}

export async function startJobs(): Promise<void> {
  if (jobsStarted) return;
  jobsStarted = true;

  if (redisConnection && env.REDIS_URL) {
    const connection = redisConnection;
    workers.push(new Worker('payment-reconciliation', async () => reconcilePaymentsJob(), { connection, concurrency: 1 }));
    workers.push(new Worker('refunds', async (job) => processRefundReviewJob(job.data), { connection, concurrency: 3 }));
    workers.push(new Worker('notifications', async (job) => sendNotificationJob(job.data), { connection, concurrency: 2 }));
    for (const worker of workers) {
      worker.on('failed', (job, error) => logger.error({ jobId: job?.id, err: error }, 'Échec d’un worker'));
      worker.on('error', (error) => logger.error({ err: error }, 'Erreur du worker'));
    }
  } else {
    logger.warn('Redis indisponible : jobs exécutés par les tâches planifiées locales; les queues persistantes sont désactivées.');
  }

  timers.push(setInterval(() => { void safelyRun('Expiration réservations', expireReservationsJob); }, 60_000));
  timers.push(setInterval(() => { void safelyRun('Expiration commandes', expireOrdersJob); }, 60_000));
  timers.push(setInterval(() => { void safelyRun('Rapprochement paiements', reconcilePaymentsJob); }, 2 * 60_000));
  timers.push(setInterval(() => { void safelyRun('Envoi notifications', sendPendingNotificationsJob); }, 60_000));
  timers.push(setInterval(() => { void safelyRun('Génération règlements quotidiens', generateDailySettlementsJob); }, 60 * 60_000));
  for (const timer of timers) timer.unref();

  await safelyRun('Expiration réservations au démarrage', expireReservationsJob);
  await safelyRun('Expiration commandes au démarrage', expireOrdersJob);
}

export async function stopJobs(): Promise<void> {
  if (!jobsStarted) return;
  jobsStarted = false;
  for (const timer of timers.splice(0)) clearInterval(timer);
  await Promise.all(workers.splice(0).map((worker) => worker.close().catch((error) => logger.error({ err: error }, 'Fermeture worker'))));
  await closeQueues();
}
