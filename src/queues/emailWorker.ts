import rabbitMQConnection from '../config/rabbitmq';
import emailService from '../services/email/emailService';
import config from '../config/env';
import logger from '../config/logger';
import { NOTIFICATION_STATUSES } from '../constants/';
import { ValidationError } from '../exceptions';
import { callCallback } from '../utils/callback';
import emailQueue, { EmailJob } from './emailQueue';
import * as amqp from 'amqplib';

class EmailWorker {
  private readonly queueName: string;
  private isRunning: boolean;

  constructor() {
    this.queueName = config.rabbitmq.queues.email;
    this.isRunning = false;
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('EmailWorker is already running.');
      return;
    }

    try {
      const consumeChannel = await rabbitMQConnection.getConsumeChannel();
      const publishChannel = await rabbitMQConnection.getPublishChannel();

      await emailQueue.init();

      await consumeChannel.prefetch(1);

      logger.info('🚀 Email worker started', { queue: this.queueName });

      this.isRunning = true;

      await consumeChannel.consume(
        this.queueName,
        async (msg: amqp.ConsumeMessage | null) => {
          if (!msg) return;

          await this.processMessage(msg, consumeChannel, publishChannel);
        },
        { noAck: false },
      );
    } catch (error: any) {
      logger.error('Failed to start EmailWorker', { error: error.message });
      throw error;
    }
  }

  /**
   * Process message
   */
  async processMessage(
    msg: amqp.ConsumeMessage,
    consumeChannel: amqp.Channel,
    publishChannel: amqp.ConfirmChannel,
  ): Promise<void> {
    const startTime = Date.now();

    const job = this.parseAndValidateMessage(msg, consumeChannel);
    if (!job) return;

    try {
      const skipped = await this.executeJob(job);
      await this.handleSuccess(job, msg, consumeChannel, startTime, { skipped });
    } catch (error: any) {
      await this.handleError(job, error, msg, consumeChannel, publishChannel);
    }
  }

  parseAndValidateMessage(msg: amqp.ConsumeMessage, consumeChannel: amqp.Channel): EmailJob | null {
    let job: EmailJob;

    try {
      job = JSON.parse(msg.content.toString());
    } catch (error: any) {
      logger.error('Invalid JSON payload, dropping message', {
        error: error.message,
        raw: msg.content.toString(),
      });
      consumeChannel.ack(msg);
      return null;
    }

    if (!job?.data?.notificationId) {
      logger.error('Invalid job payload: missing notificationId', {
        job,
      });
      consumeChannel.ack(msg);
      return null;
    }
    return job;
  }

  /**
   * @returns true if job was skipped (already processed by another worker)
   */
  async executeJob(job: EmailJob): Promise<boolean> {
    const notificationId = job.data.notificationId;
    const claimed = await emailService.updateStatus(notificationId, NOTIFICATION_STATUSES.SENDING);
    if (!claimed) {
      logger.info('Notification already processed or claimed by another worker, skipping', {
        notificationId,
        type: job.type,
      });
      return true;
    }

    logger.info('Processing job', {
      type: job.type,
      timestamp: job.timestamp,
      notificationId,
    });

    if (job.type === 'verification') {
      await emailService.sendVerificationEmail(
        job.data.to || job.data.email!,
        job.data.username!,
        job.data.verificationLink!,
      );
    } else if (job.type === 'notification') {
      await emailService.sendNotification(
        job.data.to || job.data.email!,
        job.data.subject!,
        job.data.message!,
      );
    } else {
      throw new ValidationError('Unknown job type', { type: job.type });
    }

    await emailService.updateStatus(notificationId, NOTIFICATION_STATUSES.SENT);
    return false;
  }

  async handleSuccess(
    job: EmailJob,
    msg: amqp.ConsumeMessage,
    consumeChannel: amqp.Channel,
    startTime: number,
    { skipped = false }: { skipped?: boolean } = {},
  ): Promise<void> {
    if (!skipped && job.data.callbackUrl) {
      try {
        const notification = await emailService.getById(job.data.notificationId);
        await callCallback(job.data.callbackUrl, {
          notificationId: notification.id,
          status: notification.status,
          timestamp: notification.sentAt || notification.updatedAt,
          errorMessage: notification.errorMessage ?? null,
        });
      } catch (callbackError: any) {
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

  async handleError(
    job: EmailJob,
    error: any,
    msg: amqp.ConsumeMessage,
    consumeChannel: amqp.Channel,
    publishChannel: amqp.ConfirmChannel,
  ): Promise<void> {
    logger.error('Job failed', {
      type: job?.type,
      error: error.message,
      retries: job?.retries || 0,
    });

    // Retry logic
    const maxRetries = 3;
    const currentRetries = job?.retries || 0;
    const notificationId = job?.data?.notificationId;
    const { willRetry, isNonRetriable } = this.shouldRetry(error, currentRetries, maxRetries);

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
        error.message,
      );
    }

    // Evoke callback (if exists)
    if (job?.data?.callbackUrl && notificationId) {
      try {
        const notification = await emailService.getById(notificationId);
        await this.sendCallback(job, notification, error.message);
      } catch (readError) {
        // fallback: send callback without notification object
        await this.sendCallback(job, { id: notificationId } as any, error.message);
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

  shouldRetry(
    error: any,
    currentRetries: number,
    maxRetries: number,
  ): {
    willRetry: boolean;
    isNonRetriable: boolean;
  } {
    const isNonRetriable =
      error instanceof ValidationError ||
      (error?.isOperational &&
        typeof error.statusCode === 'number' &&
        error.statusCode >= 400 &&
        error.statusCode < 500);
    const willRetry = !isNonRetriable && currentRetries < maxRetries;

    return { willRetry, isNonRetriable };
  }

  async retryJob(job: EmailJob, publishChannel: amqp.ConfirmChannel): Promise<void> {
    const delay = this.getRetryDelay(job.retries);

    publishChannel.sendToQueue(
      config.rabbitmq.queues.emailRetry,
      Buffer.from(JSON.stringify(job)),
      {
        persistent: true,
        expiration: String(delay), // ms
      },
    );

    await publishChannel.waitForConfirms();

    logger.info('Job scheduled for retry', {
      notificationId: job.data.notificationId,
      retries: job.retries,
      delayMs: delay,
    });
  }

  getRetryDelay(retries: number): number {
    const baseDelay = 1000; // 1s
    const maxDelay = 60_000; // 1 min cap

    return Math.min(baseDelay * 2 ** (retries - 1), maxDelay);
  }

  async sendCallback(job: EmailJob, notification: any, errorMessage?: string): Promise<void> {
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
      } catch (callbackError: any) {
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
  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Email worker stopped');
  }
}

// Export as singleton
const emailWorker = new EmailWorker();
export default emailWorker;
