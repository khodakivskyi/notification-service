import app from './app.js';
import config from './config/env.js';
import logger from './config/logger.js';
import db from './config/database.js';
import rabbitMQConnection from './config/rabbitmq.js';
import emailQueue from './queues/emailQueue.js';
import { Server } from 'http';
import { runMigrations } from './utils/migrationRunner.js';

const server: Server = app.listen(config.server.port, async () => {
  try {
    await db.connect();
    await runMigrations();
    await rabbitMQConnection.connect();
    await emailQueue.init();

    logger.info('🚀 Notification service started', {
      port: config.server.port,
      env: config.env,
    });
  } catch (error: unknown) {
    logger.error('❌ Initialization failed', {
      error: error instanceof Error ? error.stack : error,
    });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown(): Promise<void> {
  logger.info('🔻 Shutting down notification service...');

  server.close(async () => {
    try {
      await rabbitMQConnection.close();
      logger.info('✅ RabbitMQ connection closed');
    } catch (error: unknown) {
      logger.error('Error closing RabbitMQ connection', { error });
    }

    try {
      await db.close();
      logger.info('✅ Database pool closed');
    } catch (error: unknown) {
      logger.error('Error closing database pool', { error });
    }

    logger.info('✅ HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}
