import rabbitMQConnection from '../config/rabbitmq.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { NOTIFICATION_STATUSES } from '../constants/index.js';
import { ValidationError } from '../exceptions/index.js';
import { getErrorMessage } from '../helpers/index.js';
import { callCallback } from '../utils/callback.js';
import notificationQueue, { NotificationJob } from './notificationQueue.js';
import { Notification } from '../types/notification.js';
import * as amqp from 'amqplib';
import type { INotificationChannel } from '../interfaces/INotificationChannel.js';
import type { INotificationService } from '../interfaces/INotificationService.js';

export class NotificationWorker {
  private readonly queueName: string;
  private isRunning: boolean;

  constructor(
    private readonly notifications: INotificationService,
    private readonly channel: INotificationChannel,
  ) {
    this.queueName = config.rabbitmq.queues.outbound;
    this.isRunning = false;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info('NotificationWorker is already running.');
      return;
    }

    try {
      const consumeChannel = await rabbitMQConnection.getConsumeChannel();
      const publishChannel = await rabbitMQConnection.getPublishChannel();

      await notificationQueue.init();

      await consumeChannel.prefetch(1);

      logger.info('🚀 Notification worker started', { queue: this.queueName });

      this.isRunning = true;

      await consumeChannel.consume(
        this.queueName,
        async (msg: amqp.ConsumeMessage | null) => {
          if (!msg) return;

          await this.processMessage(msg, consumeChannel, publishChannel);
        },
        { noAck: false },
      );
    } catch (error: unknown) {
      logger.error('Failed to start NotificationWorker', { error: getErrorMessage(error) });
      throw error;
    }
  }

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
    } catch (error: unknown) {
      await this.handleError(job, error, msg, consumeChannel, publishChannel);
    }
  }

  parseAndValidateMessage(msg: amqp.ConsumeMessage, consumeChannel: amqp.Channel): NotificationJob | null {
    let job: NotificationJob;

    try {
      job = JSON.parse(msg.content.toString());
    } catch (error: unknown) {
      logger.error('Invalid JSON payload, dropping message', {
        error: getErrorMessage(error),
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
  async executeJob(job: NotificationJob): Promise<boolean> {
    const notificationId = job.data.notificationId;
    const claimed = await this.notifications.updateStatus(notificationId, NOTIFICATION_STATUSES.SENDING);
    if (!claimed) {
      logger.info('Notification already processed or claimed by another worker, skipping', {
        notificationId,
      });
      return true;
    }

    logger.info('Processing delivery job', {
      timestamp: job.timestamp,
      notificationId,
    });

    await this.channel.send(
      job.data.to,
      job.data.subject ?? '',
      job.data.htmlContent ?? '',
    );

    await this.notifications.updateStatus(notificationId, NOTIFICATION_STATUSES.SENT);
    return false;
  }

  async handleSuccess(
    job: NotificationJob,
    msg: amqp.ConsumeMessage,
    consumeChannel: amqp.Channel,
    startTime: number,
    { skipped = false }: { skipped?: boolean } = {},
  ): Promise<void> {
    if (!skipped && job.data.callbackUrl) {
      try {
        const notification = await this.notifications.getById(job.data.notificationId);
        await callCallback(job.data.callbackUrl, {
          notificationId: notification.id,
          status: notification.status,
          timestamp: notification.sentAt || notification.updatedAt,
          errorMessage: notification.errorMessage ?? null,
        });
      } catch (callbackError: unknown) {
        logger.warn('Callback failed', {
          callbackUrl: job.data.callbackUrl,
          error: getErrorMessage(callbackError),
        });
      }
    }

    consumeChannel.ack(msg);
    const duration = Date.now() - startTime;
    logger.info('Job processed successfully', {
      duration: `${duration}ms`,
    });
  }

  async handleError(
    job: NotificationJob,
    error: unknown,
    msg: amqp.ConsumeMessage,
    consumeChannel: amqp.Channel,
    publishChannel: amqp.ConfirmChannel,
  ): Promise<void> {
    const errorMessage = getErrorMessage(error);
    logger.error('Job failed', {
      error: errorMessage,
      retries: job?.retries || 0,
    });

    const maxRetries = 3;
    const currentRetries = job?.retries || 0;
    const notificationId = job?.data?.notificationId;
    const { willRetry, isNonRetriable } = this.shouldRetry(error, currentRetries, maxRetries);

    if (willRetry) {
      logger.info('Retrying job...', {
        attempt: currentRetries + 1,
        maxRetries,
      });

      await this.notifications.updateStatus(job.data.notificationId, NOTIFICATION_STATUSES.RETRYING);

      job.retries = currentRetries + 1;
    } else {
      await this.markNotificationFailed(job, errorMessage, currentRetries, maxRetries, isNonRetriable);
    }

    if (job?.data?.callbackUrl && notificationId) {
      const notification = await this.getNotificationOrStubForCallback(notificationId);
      await this.sendCallback(job, notification, errorMessage);
    }

    if (willRetry) {
      await this.retryJob(job, publishChannel);
      consumeChannel.ack(msg);
      return;
    }

    consumeChannel.nack(msg, false, false);
  }

  private async markNotificationFailed(
    job: NotificationJob,
    errorMessage: string,
    currentRetries: number,
    maxRetries: number,
    isNonRetriable: boolean,
  ): Promise<void> {
    if (isNonRetriable) {
      logger.error('Non-retriable error, marking failed', {
        error: errorMessage,
      });
    } else {
      logger.error('Max retries reached, marking failed', {
        retries: currentRetries,
        maxRetries,
        error: errorMessage,
      });
    }

    await this.notifications.updateStatus(
      job.data.notificationId,
      NOTIFICATION_STATUSES.FAILED,
      errorMessage,
    );
  }

  private async getNotificationOrStubForCallback(notificationId: string): Promise<Notification> {
    try {
      return await this.notifications.getById(notificationId);
    } catch {
      return { id: notificationId } as Notification;
    }
  }

  shouldRetry(
    error: unknown,
    currentRetries: number,
    maxRetries: number,
  ): {
    willRetry: boolean;
    isNonRetriable: boolean;
  } {
    interface OperationalError extends Error {
      isOperational?: boolean;
      statusCode?: number;
    }

    function isOperationalError(err: unknown): err is OperationalError {
      return typeof err === 'object' && err !== null && 'isOperational' in err;
    }

    const isNonRetriable =
      error instanceof ValidationError ||
      (isOperationalError(error) &&
        typeof error.statusCode === 'number' &&
        error.statusCode >= 400 &&
        error.statusCode < 500);
    const willRetry = !isNonRetriable && currentRetries < maxRetries;

    return { willRetry, isNonRetriable };
  }

  async retryJob(job: NotificationJob, publishChannel: amqp.ConfirmChannel): Promise<void> {
    const delay = this.getRetryDelay(job.retries);

    publishChannel.sendToQueue(
      config.rabbitmq.queues.outboundRetry,
      Buffer.from(JSON.stringify(job)),
      {
        persistent: true,
        expiration: String(delay),
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
    const baseDelay = 1000;
    const maxDelay = 60_000;

    return Math.min(baseDelay * 2 ** (retries - 1), maxDelay);
  }

  async sendCallback(job: NotificationJob, notification: Notification, errorMessage?: string): Promise<void> {
    if (!job?.data?.callbackUrl) return;

    try {
      await callCallback(job.data.callbackUrl, {
        notificationId: notification.id,
        status: notification.status,
        timestamp: notification.sentAt || notification.updatedAt,
        errorMessage: errorMessage ?? notification.errorMessage ?? null,
      });
    } catch {
      try {
        await callCallback(job.data.callbackUrl, {
          notificationId: job.data.notificationId,
          status: 'failed',
          timestamp: new Date().toISOString(),
          errorMessage: errorMessage,
        });
      } catch (callbackError: unknown) {
        logger.warn('Callback failed on error', {
          callbackUrl: job.data.callbackUrl,
          error: getErrorMessage(callbackError),
        });
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Notification worker stopped');
  }
}
