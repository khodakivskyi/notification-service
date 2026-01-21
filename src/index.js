const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const db = require('./config/database');
const rabbitMQConnection = require('./config/rabbitmq');
const emailQueue = require('./queues/emailQueue');

const server = app.listen(config.server.port, async () => {
    try{
        // Connect RabbitMQ
        await rabbitMQConnection.connect();
        await emailQueue.init();

        logger.info('🚀 Notification service started', {
            port: config.server.port,
            env: config.env
        });
    } catch (error) {
        logger.error('❌ Failed to initialize RabbitMQ', { error });
        process.exit(1);
    }

});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
    logger.info('🔻 Shutting down notification service...');

    server.close(async () => {
        try {
            await rabbitMQConnection.close();
            logger.info('✅ RabbitMQ connection closed');
        } catch (error) {
            logger.error('Error closing RabbitMQ connection', { error });
        }

        try {
            await db.close();
            logger.info('✅ Database pool closed');
        } catch (error) {
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