import rabbitMQConnection from '../config/rabbitmq.js';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { getErrorMessage } from '../helpers/index.js';

export interface EmailJobData {
  to: string;
  subject?: string;
  htmlContent?: string;
  notificationId: string;
  callbackUrl?: string | null;
  userId?: string | null;
}

export interface EmailJob {
  data: EmailJobData;
  timestamp: number;
  retries: number;
}

/**
 * Email Queue for handling email jobs
 */
class EmailQueue {
  private readonly queueName: string;

  constructor() {
    this.queueName = config.rabbitmq.queues.email;
  }

  /**
   * Initialize queue (create if not exists)
   */
  async init(): Promise<void> {
    try {
      const consumeChannel = await rabbitMQConnection.getConsumeChannel();

      // DLX (Dead Letter Exchange) - where RabbitMQ routes dead messages
      await consumeChannel.assertExchange(config.rabbitmq.exchanges.dlx, 'direct', {
        durable: true,
      });

      // DLQ (Dead Letter Queue) - where dead messages are stored
      await consumeChannel.assertQueue(config.rabbitmq.queues.emailDlq, { durable: true });

      // Bind DLQ to DLX using a routing key
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
        },
      });

      logger.info('Email queue initialized', {
        queue: this.queueName,
        dlx: config.rabbitmq.exchanges.dlx,
        dlq: config.rabbitmq.queues.emailDlq,
      });
    } catch (error: unknown) {
      logger.error('Failed to initialize email queue', { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Add generic notification to the queue
   */
  async addNotificationEmail(data: EmailJobData): Promise<boolean> {
    return this.addJob(data);
  }

  /**
   * Generic method for adding job
   */
  async addJob(data: EmailJobData): Promise<boolean> {
    try {
      const publishChannel = await rabbitMQConnection.getPublishChannel();

      const job: EmailJob = {
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
      logger.info('Job added to queue', { to: data.to });
      return true;
    } catch (error: unknown) {
      logger.error('Failed to add job to queue', {
        error: getErrorMessage(error) || null,
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
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

// Export as singleton
const emailQueue = new EmailQueue();
export default emailQueue;
