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
            const channel = await rabbitMQConnection.getChannel();

            await channel.assertQueue(this.queueName, {
                durable: true,
                arguments: {
                    'x-message-ttl': config.rabbitmq.settings.ttl,
                    'x-max-length': config.rabbitmq.settings.maxLength,
                }
            });
            logger.info('Email queue initialized', {queue: this.queueName});
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
            const channel = await rabbitMQConnection.getChannel();

            const job = {
                type,
                data,
                timestamp: Date.now(),
                retries: 0,
            };

            const message = Buffer.from(JSON.stringify(job));

            const sent = channel.sendToQueue(this.queueName, message, {
                persistent: true,
                contentType: 'application/json',
            });

            if (sent) {
                logger.info('Job added to queue', {type, to: data.to || data.email});
                return true;
            } else {
                throw new Error('Failed to send message to queue');
            }
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
            const channel = await rabbitMQConnection.getChannel();
            const queueInfo = await channel.checkQueue(this.queueName);
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