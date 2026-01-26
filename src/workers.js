const logger = require('./config/logger');
const rabbitMQConnection = require('./config/rabbitmq');
const emailQueue = require('./queues/emailQueue');
const emailWorker = require('./queues/emailWorker');
const db = require('./config/database');

/**
 * Workers Entry Point
 * Launches RabbitMQ consumers separately from the API
 */
async function startWorkers(){
    try{
        logger.info('🚀 Starting workers...');

        await rabbitMQConnection.connect();
        await emailQueue.init();
        await emailWorker.start();

        logger.info('All workers started successfully');

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger. info('SIGTERM received, shutting down workers...');
            await emailWorker.stop();
            await rabbitMQConnection.close();
            await db.close();
            process. exit(0);
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down workers...');
            await emailWorker.stop();
            await rabbitMQConnection.close();
            await db.close();
            process.exit(0);
        });
    } catch(error){
        logger.error('Failed to start workers', {error: error.message});
        process.exit(1);
    }
}

startWorkers();