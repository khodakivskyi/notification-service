const rabbitMQConnection = require('../config/rabbitmq');
const emailService = require('../services/email/emailService');
const config = require('../config/env');
const logger = require('../config/logger');

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

            logger.info('Processing job', {
                type: job.type,
                timestamp: job.timestamp,
            });

            let result;

            if (job.type === "verification") {
                result = await emailService.sendVerificationEmail(
                    job.data.to || job.data.email,
                    job.data.username,
                    job.data.verificationLink,
                    job.data.notificationId,
                );
            } else if (job.type === "notification") {
                result = await emailService.sendNotification(
                    job.data.to || job.data.email,
                    job.data.subject,
                    job.data.message,
                    job.data.notificationId
                );
            } else {
                throw new Error(`Unknown job type: ${job.type}`);
            }

            // Receive notification for callback
            const notification = result.notification;

            // Evoke callback (if exists)
            if (job.data.callbackUrl && notification) {
                await this.callCallback(job.data.callbackUrl, {
                    notificationId: notification.id,
                    status: notification.status,
                    timestamp: notification.sentAt || notification.updatedAt,
                });
            }

            // Success - remove the message from the queue
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

            // Evoke callback (if exists)
            if (job?.data?.callbackUrl) {
                try {
                    await this.callCallback(job.data.callbackUrl, {
                        notificationId: job.data.notificationId,
                        status: 'failed',
                        error: error.message,
                        timestamp: new Date().toISOString(),
                    });
                } catch (callbackError) {
                    logger.error('Failed to call callback on error', { error: callbackError.message });
                }
            }

            // Retry logic
            const maxRetries = 3;
            const currentRetries = job?.retries || 0;

            if (currentRetries < maxRetries) {
                logger.info('Retrying job...', {
                    attempt: currentRetries + 1,
                    maxRetries,
                });

                job.retries = currentRetries + 1;

                channel.sendToQueue(
                    this.queueName,
                    Buffer.from(JSON.stringify(job)),
                    {persistent: true}
                );

                channel.ack(msg);
            } else {
                // If max retries -> move to Dead Letter Queue
                logger.error('Max retries reached, moving to DLQ', {
                    type: job?.type,
                });

                //TODO: Dead Letter Queue
                channel.ack(msg);
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

    /**
     * Calls the URL callback
     */
    async callCallback(callbackUrl, data) {
        try {
            const https = require('https');
            const http = require('http');

            const parsedUrl = new URL(callbackUrl);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const postData = JSON.stringify(data);

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'notification-service/1.0',
                },
                timeout: 5000, // timeout
            };

            return new Promise((resolve, reject) => {
                const req = client.request(options, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            logger.info('Callback called successfully', {
                                callbackUrl,
                                statusCode: res.statusCode,
                            });
                            resolve(responseData);
                        } else {
                            logger.warn('Callback returned non-2xx status', {
                                callbackUrl,
                                statusCode: res.statusCode,
                            });
                            resolve(responseData);
                        }
                    });
                });

                req.on('error', (error) => {
                    logger.error('Callback request failed', {
                        callbackUrl,
                        error: error.message,
                    });
                    reject(error);
                });

                req.on('timeout', () => {
                    req.destroy();
                    logger.warn('Callback request timeout', { callbackUrl });
                    reject(new Error('Callback timeout'));
                });

                req.write(postData);
                req.end();
            });
        } catch (error) {
            logger.error('Failed to call callback', {
                callbackUrl,
                error: error.message,
            });
            throw error;
        }
    }
}


// Export as singleton
const emailWorker = new EmailWorker();
module.exports = emailWorker;