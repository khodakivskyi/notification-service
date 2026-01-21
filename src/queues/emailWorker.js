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

            if (job.type === "verification") {
                await emailService.sendVerificationEmail(
                    job.data.to || job.data.email,
                    job.data.username,
                    job.data.verificationLink,
                    job.data.userId);
            } else if (job.type === "notification") {
                await emailService.sendNotification(
                    job.data.to || job.data.email,
                    job.data.subject,
                    job.data.message,
                    job.data.userId);
            } else {
                throw new Error(`Unknown job type: ${job.type}`);
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

            // Retry logic
            const maxRetries = 3;
            const currentRetries = job?.retries || 0;

            if(currentRetries< maxRetries){
                logger.info('Retrying job...',{
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
    async stop(){
        this.isRunning = false;
        logger.info('Email worker stopped')
    }
}

// Export as singleton
const emailWorker = new EmailWorker();
module.exports = emailWorker;