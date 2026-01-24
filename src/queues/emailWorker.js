const rabbitMQConnection = require('../config/rabbitmq');
const emailService = require('../services/email/emailService');
const config = require('../config/env');
const logger = require('../config/logger');
const {NOTIFICATION_STATUSES} = require('../constants/index');
const {ValidationError} = require('../exceptions');
const {callCallback} = require('../utils/callback');
const emailQueue = require('./emailQueue');

class EmailWorker {
    constructor() {
        this.queueName = config.rabbitmq.queues.email;
        this.isRunning = false;
    }

    /**
     * Start worker
     */
    async start() {
        if (this.isRunning) {
            logger.info('EmailWorker is already running.');
            return;
        }

        try {
            /** @type {import('amqplib').Channel} */
            const consumeChannel = await rabbitMQConnection.getConsumeChannel();
            const publishChannel = await rabbitMQConnection.getPublishChannel();

            await emailQueue.init();

            await consumeChannel.prefetch(1);

            logger.info('🚀 Email worker started', {queue: this.queueName});

            this.isRunning = true;

            await consumeChannel.consume(
                this.queueName,
                async (msg) => {
                    if (!msg) return;

                    await this.processMessage(msg, consumeChannel, publishChannel);
                },
                {noAck: false}
            );
        } catch (error) {
            logger.error('Failed to start EmailWorker', {error: error.message});
            throw error;
        }
    }

    /**
     * Process message
     */
    async processMessage(msg, consumeChannel, publishChannel) {
        const startTime = Date.now();

        const job = this.parseAndValidateMessage(msg, consumeChannel);
        if (!job) return;

        try {
            await this.executeJob(job);
            await this.handleSuccess(job, msg, consumeChannel, startTime);
        } catch (error) {
            await this.handleError(job, error, msg, consumeChannel, publishChannel);
        }
    }

    parseAndValidateMessage(msg, consumeChannel) {
        let job;

        try {
            job = JSON.parse(msg.content.toString());
        } catch (error) {
            logger.error('Invalid JSON payload, dropping message', {
                error: error.message,
                raw: msg.content.toString(),
            });
            consumeChannel.ack(msg);
            return;
        }

        if (!job?.data?.notificationId) {
            logger.error('Invalid job payload: missing notificationId', {
                job,
            });
            consumeChannel.ack(msg);
            return;
        }
        return job;
    }

    async executeJob(job) {
        logger.info('Processing job', {
            type: job.type,
            timestamp: job.timestamp,
        });

        await emailService.updateStatus(job.data.notificationId, NOTIFICATION_STATUSES.SENDING);

        if (job.type === 'verification') {
            await emailService.sendVerificationEmail(
                job.data.to || job.data.email,
                job.data.username,
                job.data.verificationLink,
            );
        } else if (job.type === 'notification') {
            await emailService.sendNotification(
                job.data.to || job.data.email,
                job.data.subject,
                job.data.message,
            );
        } else {
            throw new ValidationError('Unknown job type', {type: job.type});
        }

        // Success - remove the message from the queue
        await emailService.updateStatus(job.data.notificationId, NOTIFICATION_STATUSES.SENT);
    }

    async handleSuccess(job, msg, consumeChannel, startTime) {
        if (job.data.callbackUrl) {
            try {
                const notification = await emailService.getById(job.data.notificationId);
                await callCallback(job.data.callbackUrl, {
                    notificationId: notification.id,
                    status: notification.status,
                    timestamp: notification.sentAt || notification.updatedAt,
                    errorMessage: notification.errorMessage ?? null,
                });
            } catch (callbackError) {
                logger.warn('Callback failed', {
                    callbackUrl: job.data.callbackUrl,
                    error: callbackError.message,
                });
            }
        }

        consumeChannel.ack(msg);
        const duration = Date.now() - startTime;
        logger.info('Job processed successfully', {
            type: job.type,
            duration: `${duration}ms`,
        });
    }

    async handleError(job, error, msg, consumeChannel, publishChannel) {
        logger.error('Job failed', {
            type: job?.type,
            error: error.message,
            retries: job?.retries || 0,
        });

        // Retry logic
        const maxRetries = 3;
        const currentRetries = job?.retries || 0;
        const notificationId = job?.data?.notificationId;
        const {willRetry, isNonRetriable} = this.shouldRetry(error, currentRetries, maxRetries);

        if (willRetry) {
            logger.info('Retrying job...', {
                attempt: currentRetries + 1,
                maxRetries,
            });

            await emailService.updateStatus(job.data.notificationId, NOTIFICATION_STATUSES.RETRYING);

            job.retries = currentRetries + 1;

        } else {
            if (isNonRetriable) {
                logger.error('Non-retriable error, marking failed', {
                    type: job?.type,
                    error: error.message,
                });
            } else {
                logger.error('Max retries reached, marking failed', {
                    type: job?.type,
                    retries: currentRetries,
                    maxRetries,
                    error: error.message,
                });
            }

            await emailService.updateStatus(
                job.data.notificationId,
                NOTIFICATION_STATUSES.FAILED,
                error.message
            );
        }

        // Evoke callback (if exists)
        if (job?.data?.callbackUrl && notificationId) {
            try {
                const notification = await emailService.getById(notificationId);
                await this.sendCallback(job, notification, error.message);
            } catch (readError) {
                // fallback: send callback without notification object
                await this.sendCallback(job, { id: notificationId }, error.message);
            }
        }

        if (willRetry) {
            await this.retryJob(job, publishChannel);
            consumeChannel.ack(msg);
            return;
        }

        // willRetry === false => dead-letter
        consumeChannel.nack(msg, false, false);
    }

    shouldRetry(error, currentRetries, maxRetries) {
        const isNonRetriable =
            error instanceof ValidationError ||
            (error?.isOperational &&
                typeof error.statusCode === 'number' &&
                error.statusCode >= 400 &&
                error.statusCode < 500);
        const willRetry = !isNonRetriable && currentRetries < maxRetries;

        return {willRetry, isNonRetriable};
    }

    async retryJob(job, publishChannel) {
        publishChannel.sendToQueue(
            this.queueName,
            Buffer.from(JSON.stringify(job)),
            {persistent: true}
        );

        await publishChannel.waitForConfirms();
    }

    async sendCallback(job, notification, errorMessage) {
        if (!job?.data?.callbackUrl) return;

        try {
            await callCallback(job.data.callbackUrl, {
                notificationId: notification.id,
                status: notification.status,
                timestamp: notification.sentAt || notification.updatedAt,
                errorMessage: errorMessage ?? notification.errorMessage ?? null,
            });
        } catch (readOrCallbackError) {
            try {
                await callCallback(job.data.callbackUrl, {
                    notificationId: job.data.notificationId,
                    status: 'failed',
                    timestamp: new Date().toISOString(),
                    errorMessage: errorMessage,
                });
            } catch (callbackError) {
                logger.warn('Callback failed on error', {
                    callbackUrl: job.data.callbackUrl,
                    error: callbackError.message,
                });
            }
        }
    }

    /**
     * Stop worker gracefully
     */
    async stop() {
        this.isRunning = false;
        logger.info('Email worker stopped')
    }
}


// Export as singleton
const emailWorker = new EmailWorker();
module.exports = emailWorker;