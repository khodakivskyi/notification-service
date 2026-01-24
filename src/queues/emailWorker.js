const rabbitMQConnection = require('../config/rabbitmq');
const emailService = require('../services/email/emailService');
const config = require('../config/env');
const logger = require('../config/logger');
const {NOTIFICATION_STATUSES} = require('../constants/index');
const {ValidationError} = require('../exceptions');
const {callCallback} = require('../utils/callback');

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
            const channel = await rabbitMQConnection.getChannel();

            await channel.assertQueue(this.queueName, {
                durable: true,
                arguments: {
                    'x-message-ttl': config.rabbitmq.settings.ttl,
                    'x-max-length': config.rabbitmq.settings.maxLength,
                }
            });
            await channel.prefetch(1);

            logger.info('🚀 Email worker started', {queue: this.queueName});

            this.isRunning = true;

            await channel.consume(
                this.queueName,
                async (msg) => {
                    if (!msg) return;

                    await this.processMessage(msg, channel);
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
    async processMessage(msg, channel) {
        const startTime = Date.now();
        let job;

        try {
            job = JSON.parse(msg.content.toString());
        } catch (error) {
            logger.error('Invalid JSON payload, dropping message', {
                error: error.message,
                raw: msg.content.toString(),
            });
            channel.ack(msg);
            return;
        }

        if (!job?.data?.notificationId) {
            logger.error('Invalid job payload: missing notificationId', {
                job,
            });
            channel.ack(msg);
            return;
        }

        try {
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

            const notificationId = job.data.notificationId;

            // Success - remove the message from the queue
            await emailService.updateStatus(job.data.notificationId, NOTIFICATION_STATUSES.SENT);

            if (job.data.callbackUrl) {
                try {
                    const notification = await emailService.getById(notificationId);
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

            channel.ack(msg);
            const duration = Date.now() - startTime;
            logger.info('Job processed successfully', {
                type: job.type,
                duration: `${duration}ms`,
            });

        } catch (error) {
            logger.error('Job failed', {
                type: job?.type,
                error: error.message,
                retries: job?.retries || 0,
            });

            // Retry logic
            const maxRetries = 3;
            const currentRetries = job?.retries || 0;
            const notificationId = job?.data?.notificationId;
            const isNonRetriable =
                error instanceof ValidationError ||
                (error?.isOperational &&
                    typeof error.statusCode === 'number' &&
                    error.statusCode >= 400 &&
                    error.statusCode < 500);
            const willRetry = !isNonRetriable && currentRetries < maxRetries;

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

                //TODO: Dead Letter Queue
            }

            // Evoke callback (if exists)
            if (job?.data?.callbackUrl && notificationId) {
                try {
                    const notification = await emailService.getById(notificationId);
                    await callCallback(job.data.callbackUrl, {
                        notificationId: notification.id,
                        status: notification.status,
                        timestamp: notification.sentAt || notification.updatedAt,
                        errorMessage: notification.errorMessage ?? error.message,
                    });
                } catch (readOrCallbackError) {
                    try {
                        await callCallback(job.data.callbackUrl, {
                            notificationId,
                            status: 'failed',
                            timestamp: new Date().toISOString(),
                            errorMessage: error.message,
                        });
                    } catch (callbackError) {
                        logger.warn('Callback failed on error', {
                            callbackUrl: job.data.callbackUrl,
                            error: callbackError.message,
                        });
                    }
                }
            }

            if (willRetry) {
                channel.sendToQueue(
                    this.queueName,
                    Buffer.from(JSON.stringify(job)),
                    {persistent: true}
                );
            }

            channel.ack(msg);
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