const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./config/database');

const server = app.listen(config.server.port, () => {
    logger.info('🚀 Notification service started', {
        port: config.server.port,
        env: config.env
    });
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
    logger.info('🔻 Shutting down notification service...');

    server.close(async () => {
        try {
            await db.close()
            logger.info('✅ Database pool closed');
        } catch (error) {
            logger.error('Error closing database pool', {error});
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