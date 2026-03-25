import { Pool, QueryResult, PoolClient } from 'pg';
import logger from './logger.js';
import config from './env.js';

// Database Pool Configuration
const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ...(config.env === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Connecting to the database
pool.on('connect', (client: PoolClient) => {
  logger.info('New database client connected', {
    processId: (client as any).processID,
  });
});

// Removing a client from the pool
pool.on('remove', (client: PoolClient) => {
  logger.info('Database client removed from pool', {
    processId: (client as any).processID,
  });
});

// Handling errors on idle clients
pool.on('error', (error: Error) => {
  logger.error('Unexpected error on idle database client', {
    error: error.message,
    stack: error.stack,
  });
});

// ========================================
// Helpers
// ========================================

/**
 * Initialize database connection
 */
export async function connect(): Promise<void> {
  try {
    const client = await pool.connect();
    logger.info('✅ Database connection successful');
    client.release();
  } catch (error: unknown) {
    logger.error('❌ Failed to connect to database', {
      error: error instanceof Error ? error.message : '',
      database_url: config.database.url,
    });
    throw error;
  }
}

/**
 * Execute SQL query
 * @param text - SQL query
 * @param params - Parameters (for prepared statements)
 * @returns Query result
 */
export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug('Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return result;
  } catch (error: unknown) {
    logger.error('Error executing query', {
      query: text,
      error: error instanceof Error ? error.message : '',
      stack: error instanceof Error ? error.stack : '',
    });
    throw error;
  }
}

// Check connection (for health checks)
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error: unknown) {
    logger.error('Database connection check failed', {
      error: error instanceof Error ? error.message : '',
    });
    return false;
  }
}

// Closing all connections (graceful shutdown)
export async function close(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool has been closed');
  } catch (error: unknown) {
    logger.error('Error closing database pool', {
      error: error instanceof Error ? error.message : '',
    });
    throw error;
  }
}

export default {
  connect,
  query,
  checkConnection,
  close,
};
