import * as amqp from 'amqplib';
import logger from './logger';
import config from './env';

/**
 * RabbitMQ Connection Manager
 */
class RabbitMQConnection {
  private connection: any = null;
  private consumeChannel: amqp.Channel | null = null;
  private publishChannel: amqp.ConfirmChannel | null = null;
  private isConnected: boolean = false;

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<amqp.Channel> {
    if (this.isConnected && this.consumeChannel) {
      return this.consumeChannel;
    }

    try {
      logger.info('Connecting to RabbitMQ... ', { url: config.rabbitmq.url });

      const connection = await amqp.connect(config.rabbitmq.url);
      this.connection = connection;
      this.consumeChannel = await connection.createChannel();
      this.publishChannel = await connection.createConfirmChannel();

      connection.on('error', (error: Error) => {
        logger.error('RabbitMQ connection error', { error: error.message });
        this.isConnected = false;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
      });

      this.isConnected = true;
      logger.info('RabbitMQ connected successfully');
      return this.consumeChannel;
    } catch (error: any) {
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      throw error;
    }
  }

  /**
   * Get consume channel (for consuming messages, ack/nack operations)
   * @returns Regular channel for consuming
   */
  async getConsumeChannel(): Promise<amqp.Channel> {
    if (!this.isConnected || !this.consumeChannel) {
      await this.connect();
    }
    return this.consumeChannel!;
  }

  /**
   * Get publish channel with confirm mode (for reliable message publishing)
   * Waits for broker confirmation before returning success
   * @returns Confirm channel for publishing
   */
  async getPublishChannel(): Promise<amqp.ConfirmChannel> {
    if (!this.isConnected || !this.publishChannel) {
      await this.connect();
    }
    return this.publishChannel!;
  }

  /**
   * Close connection gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.consumeChannel) {
        await this.consumeChannel.close();
      }

      if (this.publishChannel) {
        await this.publishChannel.close();
      }

      if (this.connection) {
        await (this.connection as any).close();
      }

      this.isConnected = false;
      logger.info('RabbitMQ connection closed gracefully');
    } catch (error: any) {
      logger.error('Error closing RabbitMQ connection', { error: error.message });
    }
  }

  /**
   * Health check
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.isConnected || !this.consumeChannel || !this.publishChannel || !this.connection) {
        return false;
      }

      // Check if connection stream is still alive
      const connectionStream = (this.connection as any).connection?.stream;
      return connectionStream && !connectionStream.destroyed;
    } catch (error: any) {
      logger.error('RabbitMQ health check failed', { error: error.message });
      return false;
    }
  }
}

// Export as singleton
const rabbitMQConnection = new RabbitMQConnection();
export default rabbitMQConnection;
