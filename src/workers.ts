import logger from './config/logger.js';
import rabbitMQConnection from './config/rabbitmq.js';
import emailQueue from './queues/emailQueue.js';
import { emailWorker } from './container.js';
import db from './config/database.js';
import { createShutdownHandler } from './utils/shutdown.js';

/**
 * Workers Entry Point
 * Launches RabbitMQ consumers separately from the API
 */
async function startWorkers(): Promise<void> {
  try {
    logger.info('🚀 Starting workers...');

    await db.connect();
    await rabbitMQConnection.connect();
    await emailQueue.init();
    await emailWorker.start();

    logger.info('All workers started successfully');

    const shutdown = createShutdownHandler({
      label: 'workers',
      stopWorker: () => emailWorker.stop(),
      closeRabbitMQ: () => rabbitMQConnection.close(),
      closeDatabase: () => db.close(),
    });

    process.on('SIGTERM', () => void shutdown());
    process.on('SIGINT', () => void shutdown());
  } catch (error: any) {
    logger.error('Failed to start workers', { error: error.message });
    process.exit(1);
  }
}

startWorkers().then();
