import type { Server } from 'http';
import logger from '../config/logger.js';

export interface ShutdownServices {
  label: string;
  httpServer?: Server;
  stopWorker?: () => Promise<void>;
  closeRabbitMQ: () => Promise<void>;
  closeDatabase: () => Promise<void>;
  forceExitAfterMs?: number;
}

/**
 * Registers nothing by itself — returns a handler for SIGTERM / SIGINT.
 */
export function createShutdownHandler(services: ShutdownServices): () => Promise<void> {
  const { label, forceExitAfterMs = 10_000 } = services;

  async function closeDependencies(): Promise<void> {
    if (services.stopWorker) {
      try {
        await services.stopWorker();
        logger.info('✅ Worker stopped');
      } catch (error: unknown) {
        logger.error('Error stopping worker', { error });
      }
    }

    try {
      await services.closeRabbitMQ();
      logger.info('✅ RabbitMQ connection closed');
    } catch (error: unknown) {
      logger.error('Error closing RabbitMQ connection', { error });
    }

    try {
      await services.closeDatabase();
      logger.info('✅ Database pool closed');
    } catch (error: unknown) {
      logger.error('Error closing database pool', { error });
    }
  }

  return async function shutdown(): Promise<void> {
    logger.info(`🔻 Shutting down ${label}...`);

    const forceTimer = setTimeout(() => {
      logger.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, forceExitAfterMs);

    const finish = async (): Promise<void> => {
      try {
        await closeDependencies();
      } finally {
        clearTimeout(forceTimer);
      }
      logger.info('✅ Shutdown complete');
      process.exit(0);
    };

    if (services.httpServer) {
      services.httpServer.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server', { error: err });
        }
        logger.info('✅ HTTP server closed');
        void finish();
      });
    } else {
      await finish();
    }
  };
}
