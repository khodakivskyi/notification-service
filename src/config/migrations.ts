import path from 'path';
import config from './env';

export const migrationsConfig = {
  databaseUrl: config.database.url,
  migrationsTable: 'pgmigrations',
  dir: path.resolve(process.cwd(), 'migrations'),
  direction: 'up' as const,
  count: Infinity,
  timestamp: true,
};
