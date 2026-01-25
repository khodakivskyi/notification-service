const rabbitMQConnection = require('../config/rabbitmq');
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * Email Queue for handling email jobs
 */
class EmailQueue {
    constructor() {
        this.queueName = config.rabbitmq.queues.email;
    }

    /**
     * Initialize queue (create if not exists)
     */
    async init() {
        try {
            const consumeChannel = await rabbitMQConnection.getConsumeChannel();

            // DLX (Dead Letter Exchange) - where RabbitMQ routes dead messages
            await consumeChannel.assertExchange(config.rabbitmq.exchanges.dlx, 'direct', {durable: true});

            // DLQ (Dead Letter Queue) - where dead messages are stored
            await consumeChannel.assertQueue(config.rabbitmq.queues.emailDlq, {durable: true});

            //Bind DLQ to DLX using a routing key
            const dlx = String(config.rabbitmq.exchanges.dlx);
            const dlq = String(config.rabbitmq.queues.emailDlq);
            const dlqKey = String(config.rabbitmq.routingKeys.emailDlq);

            await consumeChannel.bindQueue(dlq, dlx, dlqKey);

            // Main email queue configured with DLX settings
            await consumeChannel.assertQueue(this.queueName, {
                durable: true,
                arguments: {
                    'x-max-length': config.rabbitmq.settings.maxLength,
                    'x-dead-letter-exchange': config.rabbitmq.exchanges.dlx,
                    'x-dead-letter-routing-key': config.rabbitmq.routingKeys.emailDlq,
                },
            });

            // Retry queue
            await consumeChannel.assertQueue(config.rabbitmq.queues.emailRetry, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': '',
                    'x-dead-letter-routing-key': this.queueName,
                }
            });

            logger.info('Email queue initialized', {
                queue: this.queueName,
                dlx: config.rabbitmq.exchanges.dlx,
                dlq: config.rabbitmq.queues.emailDlq,
            });
        } catch (error) {
            logger.error('Failed to initialize email queue', {error: error.message});
            throw error;
        }
    }

    /**
     * Add verification email to the queue
     * @param {Object} data - Email data
     * @param {string} data.to - Recipient email
     * @param {string} data.username - Username
     * @param {string} data.verificationLink - Verification link
     * @param {string} data.notificationId - Notification ID
     * @param {string|null} data.callbackUrl - Callback Url
     * @param {string|null} data.userId - User ID
     */
    async addVerificationEmail(data) {
        return this.addJob('verification', data);
    }

    /**
     * Add generic notification to the queue
     * @param {Object} data - Email data
     * @param {string} data.to - Recipient email
     * @param {string} data.subject - Subject
     * @param {string} data.message - Message
     * @param {string} data.notificationId - Notification ID
     * @param {string|null} data.callbackUrl - Callback Url
     * @param {string|null} data.userId - User ID
     */
    async addNotificationEmail(data) {
        return this.addJob('notification', data);
    }

    /**
     * Generic method for adding job
     * @param {string} type - Job type ('verification' | 'notification')
     * @param {Object} data - Job data
     */
    async addJob(type, data) {
        try {
            const publishChannel = await rabbitMQConnection.getPublishChannel();

            const job = {
                type,
                data,
                timestamp: Date.now(),
                retries: 0,
            };

            const message = Buffer.from(JSON.stringify(job));

            publishChannel.sendToQueue(this.queueName, message, {
                persistent: true,
                contentType: 'application/json',
            });

            await publishChannel.waitForConfirms();
            logger.info('Job added to queue', {type, to: data.to || data.email});
            return true;
        } catch (error) {
            logger.error('Failed to add job to queue', {
                type,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Get queue statistics
     */
    async getStats() {
        try {
            const consumeChannel = await rabbitMQConnection.getConsumeChannel();
            const queueInfo = await consumeChannel.checkQueue(this.queueName);
            return {
                queue: this.queueName,
                messageCount: queueInfo.messageCount,
                consumerCount: queueInfo.consumerCount,
            };
        } catch (error) {
            logger.error('Failed to get queue stats', {error: error.message});
            return null;
        }
    }
}

// Export as singleton
const emailQueue = new EmailQueue();
module.exports = emailQueue;