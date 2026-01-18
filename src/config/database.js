const {Pool} = require('pg');
const logger = require('./logger');
const config = require('./env');


// ========================================
// Database Pool Configuration
// ========================================
const pool = new Pool({
    connectionString: config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ...(config.env === 'production' ? {ssl: {rejectUnauthorized: false}} : {}),
});

// connecting to the database
pool.on('connect', (client) => {
    logger.info('New database client connected', {
        processId: client.processID,
    });
});

// removing a client from the pool
pool.on('remove', (client) => {
    logger.info('Database client removed from pool', {
        processId: client.processID,
    });
});

// handling errors on idle clients
pool.on('error', (error) => {
    logger.error('Unexpected error on idle database client', {
        error: error.message,
        stack: error.stack,
    });
});



// ========================================
// Helpers
// ========================================

/**
 * Execute SQL query
 * @param {string} text - SQL query
 * @param {Array} params - Parameters (for prepared statements)
 * @returns {Promise<Object>} - Query result
 */
async function query(text, params) {
    const start = Date.now();

    try{
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        logger.debug('Executed query', {
            query: text,
            duration: `${duration}ms`,
            rows: result.rowCount,
        });

        return result;
    }
    catch (error) {
        logger.error('Error executing query', {
            query: text,
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}

/**
 * Get client from pool
 */
async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);

    client.query = async (text, params) => {
        const start = Date.now();

        try{
            const result = await originalQuery(text, params);
            const duration = Date.now() - start;

            logger.debug('Client query executed', { duration:  `${duration}ms` });
        }
        catch (error) {
            logger.error('Client query error', { error: error.message });
            throw error;
        }
    };

    return client;
}


// Check connection (for health checks)
async function checkConnection() {
    try{
        await pool.query('SELECT 1');
        return true;
    }
    catch (error) {
        logger.error('Database connection check failed', {
            error: error.message,
        });
        return false;
    }
}


// Closing all connections (graceful shutdown)
async function close() {
    try{
        await pool.end();
        logger.info('Database pool has been closed');
    }
    catch (error) {
        logger.error('Error closing database pool', {
            error: error.message,
        });
        throw error;
    }
}


module.exports = {
    query,
    getClient,
    checkConnection,
    close,
};