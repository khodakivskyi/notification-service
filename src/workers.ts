import logger from './config/logger.js';
import rabbitMQConnection from './config/rabbitmq.js';
import emailQueue from './queues/emailQueue.js';
import emailWorker from './queues/emailWorker.js';
import db from './config/database.js';

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

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down workers...');
      await emailWorker.stop();
      await rabbitMQConnection.close();
      await db.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down workers...');
      await emailWorker.stop();
      await rabbitMQConnection.close();
      await db.close();
      process.exit(0);
    });
  } catch (error: any) {
    logger.error('Failed to start workers', { error: error.message });
    process.exit(1);
  }
}

startWorkers().then();
