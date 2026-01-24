const amqp = require('amqplib');
const logger = require('../config/logger');
const config = require('../config/env');

/**
 * RabbitMQ Connection Manager
 */
class RabbitMQConnection {
    constructor() {
        this.connection = null;
        this.consumeChannel = null;
        this.publishChannel = null;
        this.isConnected = false;
    }

    /**
     * Connect to RabbitMQ
     */
    async connect() {
        if (this.isConnected) {
            return this.consumeChannel;
        }

        try {
            logger.info('Connecting to RabbitMQ... ', {url: config.rabbitmq.url});

            this.connection = await amqp.connect(config.rabbitmq.url);
            this.consumeChannel = await this.connection.createChannel();
            this.publishChannel = await this.connection.createConfirmChannel();

            this.connection.on('error', (err) => {
                logger.error('RabbitMQ connection error', {error: err.message});
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.isConnected = false;
            });

            this.isConnected = true;
            logger.info('RabbitMQ connected successfully');
        } catch (error) {
            logger.error('Failed to connect to RabbitMQ', {error: error.message});
            throw error;
        }
    }

    /**
     * Get consume channel (for consuming messages, ack/nack operations)
     * @returns {Promise<import('amqplib').Channel>} Regular channel for consuming
     */
    async getConsumeChannel() {
        if (!this.isConnected || !this.consumeChannel) {
            await this.connect();
        }
        return this.consumeChannel;
    }

    /**
     * Get publish channel with confirm mode (for reliable message publishing)
     * Waits for broker confirmation before returning success
     * @returns {Promise<import('amqplib').ConfirmChannel>} Confirm channel for publishing
     */
    async getPublishChannel() {
        if (!this.isConnected || !this.publishChannel) {
            await this.connect();
        }
        return this.publishChannel;
    }

    /**
     * Close connection gracefully
     */
    async close() {
        try {
            if (this.consumeChannel) {
                await this.consumeChannel.close();
            }

            if(this.publishChannel){
                await this.publishChannel.close();
            }

            if (this.connection) {
                await this.connection.close();
            }

            this.isConnected = false;
            logger.info('RabbitMQ connection closed gracefully');
        } catch (error) {
            logger.error('Error closing RabbitMQ connection', {error: error.message});
        }
    }

    /**
     * Health check
     */
    async checkConnection() {
        try{
            if(!this.isConnected || !this.consumeChannel || !this.publishChannel){
                return false;
            }

            return this.connection && !this.connection.connection.stream.destroyed;
        }
        catch (error) {
            logger.error('RabbitMQ health check failed', {error: error.message});
            return false;
        }
    }
}

// Export as singleton
const rabbitMQConnection = new RabbitMQConnection();

module.exports = rabbitMQConnection;