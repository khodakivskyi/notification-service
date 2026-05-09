import rabbitMQConnection from '../config/rabbitmq';
import config from '../config/env';
import logger from '../config/logger';

export interface EmailJobData {
  to?: string;
  email?: string;
  username?: string;
  verificationLink?: string;
  subject?: string;
  message?: string;
  notificationId: string;
  callbackUrl?: string | null;
  userId?: string | null;
}

export interface EmailJob {
  type: 'verification' | 'notification';
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
    } catch (error: any) {
      logger.error('Failed to initialize email queue', { error: error.message });
      throw error;
    }
  }

  /**
   * Add verification email to the queue
   */
  async addVerificationEmail(data: EmailJobData): Promise<boolean> {
    return this.addJob('verification', data);
  }

  /**
   * Add generic notification to the queue
   */
  async addNotificationEmail(data: EmailJobData): Promise<boolean> {
    return this.addJob('notification', data);
  }

  /**
   * Generic method for adding job
   */
  async addJob(type: 'verification' | 'notification', data: EmailJobData): Promise<boolean> {
    try {
      const publishChannel = await rabbitMQConnection.getPublishChannel();

      const job: EmailJob = {
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
      logger.info('Job added to queue', { type, to: data.to || data.email });
      return true;
    } catch (error: any) {
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
  async getStats(): Promise<{ queue: string; messageCount: number; consumerCount: number } | null> {
    try {
      const consumeChannel = await rabbitMQConnection.getConsumeChannel();
      const queueInfo = await consumeChannel.checkQueue(this.queueName);
      return {
        queue: this.queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
      };
    } catch (error: any) {
      logger.error('Failed to get queue stats', { error: error.message });
      return null;
    }
  }
}

// Export as singleton
const emailQueue = new EmailQueue();
export default emailQueue;
