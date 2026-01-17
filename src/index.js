require('dotenv').config();

const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const emailService = require('./services/email/emailService');


const server = app.listen(config.server.port, () => {
    logger.info('🚀 Notification service started', {
        port: config.server.port,
        env: config.server.env
    });
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
    logger.info('🔻 Shutting down notification service...');

    server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}