const { runner } = require('node-pg-migrate') as { runner: (options: object) => Promise<void> };
import { migrationsConfig } from '../config/migrations';
import logger from '../config/logger';

export async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    await runner({
      direction: 'up',
      migrationsTable: migrationsConfig.migrationsTable,
      dir: migrationsConfig.dir,
      databaseUrl: migrationsConfig.databaseUrl,
      count: Infinity,
      noLock: false,
      singleTransaction: true,
    });

    logger.info('Migrations executed successfully. Database is up to date.');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  }
}
