import rabbitMQConnection from '../config/rabbitmq.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { getErrorMessage } from '../helpers/index.js';

/** Payload for a single outbound delivery job (channel interprets `to` / content). */
export interface NotificationJobPayload {
  to: string;
  subject?: string;
  htmlContent?: string;
  notificationId: string;
  callbackUrl?: string | null;
  userId?: string | null;
}

export interface NotificationJob {
  data: NotificationJobPayload;
  timestamp: number;
  retries: number;
}

/**
 * RabbitMQ queue for asynchronous notification delivery (any INotificationChannel).
 */
class NotificationQueue {
  private readonly queueName: string;

  constructor() {
    this.queueName = config.rabbitmq.queues.outbound;
  }

  async init(): Promise<void> {
    try {
      const consumeChannel = await rabbitMQConnection.getConsumeChannel();

      await consumeChannel.assertExchange(config.rabbitmq.exchanges.dlx, 'direct', {
        durable: true,
      });

      await consumeChannel.assertQueue(config.rabbitmq.queues.outboundDlq, { durable: true });

      const dlx = String(config.rabbitmq.exchanges.dlx);
      const dlq = String(config.rabbitmq.queues.outboundDlq);
      const dlqKey = String(config.rabbitmq.routingKeys.outboundDlq);

      await consumeChannel.bindQueue(dlq, dlx, dlqKey);

      await consumeChannel.assertQueue(this.queueName, {
        durable: true,
        arguments: {
          'x-max-length': config.rabbitmq.settings.outboundMaxLength,
          'x-dead-letter-exchange': config.rabbitmq.exchanges.dlx,
          'x-dead-letter-routing-key': config.rabbitmq.routingKeys.outboundDlq,
        },
      });

      await consumeChannel.assertQueue(config.rabbitmq.queues.outboundRetry, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.queueName,
        },
      });

      logger.info('Notification delivery queue initialized', {
        queue: this.queueName,
        dlx: config.rabbitmq.exchanges.dlx,
        dlq: config.rabbitmq.queues.outboundDlq,
      });
    } catch (error: unknown) {
      logger.error('Failed to initialize notification delivery queue', { error: getErrorMessage(error) });
      throw error;
    }
  }

  async addJob(data: NotificationJobPayload): Promise<boolean> {
    try {
      const publishChannel = await rabbitMQConnection.getPublishChannel();

      const job: NotificationJob = {
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
      logger.info('Delivery job added to queue', { to: data.to });
      return true;
    } catch (error: unknown) {
      logger.error('Failed to add job to queue', {
        error: getErrorMessage(error) || null,
      });
      throw error;
    }
  }

  async getStats(): Promise<{ queue: string; messageCount: number; consumerCount: number } | null> {
    try {
      const consumeChannel = await rabbitMQConnection.getConsumeChannel();
      const queueInfo = await consumeChannel.checkQueue(this.queueName);
      return {
        queue: this.queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
      };
    } catch (error: unknown) {
      logger.error('Failed to get queue stats', { error: getErrorMessage(error) });
      return null;
    }
  }
}

const notificationQueue = new NotificationQueue();
export default notificationQueue;
