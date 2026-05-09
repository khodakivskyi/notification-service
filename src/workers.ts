import logger from './config/logger.js';
import rabbitMQConnection from './config/rabbitmq.js';
import notificationQueue from './queues/notificationQueue.js';
import { notificationWorker } from './container.js';
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
    await notificationQueue.init();
    await notificationWorker.start();

    logger.info('All workers started successfully');

    const shutdown = createShutdownHandler({
      label: 'workers',
      stopWorker: () => notificationWorker.stop(),
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
