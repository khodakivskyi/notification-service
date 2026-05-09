import app from './app.js';
import config from './config/env.js';
import logger from './config/logger.js';
import db from './config/database.js';
import rabbitMQConnection from './config/rabbitmq.js';
import emailQueue from './queues/emailQueue.js';
import { Server } from 'http';
import { runMigrations } from './utils/migrationRunner.js';
import { createShutdownHandler } from './utils/shutdown.js';

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

const shutdown = createShutdownHandler({
  label: 'notification service',
  httpServer: server,
  closeRabbitMQ: () => rabbitMQConnection.close(),
  closeDatabase: () => db.close(),
});

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
