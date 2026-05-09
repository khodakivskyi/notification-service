import { runner } from 'node-pg-migrate';
import { migrationsConfig } from '../config/migrations.js';
import logger from '../config/logger.js';

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
