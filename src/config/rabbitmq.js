const amqp = require('amqplib');
const logger = require('../config/logger');
const config = require('../config/env');

/**
 * RabbitMQ Connection Manager
 */
class RabbitMQConnection {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }

    /**
     * Connect to RabbitMQ
     */
    async connect() {
        if (this.isConnected) {
            return this.channel;
        }

        try {
            logger.info('Connecting to RabbitMQ... ', {url: config.rabbitmq.url});

            this.connection = await amqp.connect(config.rabbitmq.url);
            this.channel = await this.connection.createChannel();

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

            return this.channel;
        } catch (error) {
            logger.error('Failed to connect to RabbitMQ', {error: error.message});
            throw error;
        }
    }

    /**
     * Get channel (creates connection if not connected)
     */
    async getChannel() {
        if (!this.isConnected || !this.channel) {
            await this.connect();
        }
        return this.channel;
    }

    /**
     * Close connection gracefully
     */
    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
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
            if(!this.isConnected || !this.channel){
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