require('dotenv').config();

const logger = require('./logger');
const joi = require('joi');

// Define the schema for environment variables
const envSchema = joi.object({
    NODE_ENV: joi.string()
        .valid('development', 'production', 'test')
        .default('development'),

    PORT: joi.number().default(3000),

    DATABASE_URL: joi.string().uri().required(),

    SMTP_HOST:  joi.string().required(),
    SMTP_PORT: joi.number().required(),
    SMTP_USER: joi.string().email().required(),
    SMTP_PASS: joi.string().required(),

    LOG_LEVEL: joi.string()
        .valid('error', 'warn', 'info', 'debug')
        .default('info'),

    RABBITMQ_URL:  joi.string().uri().default('amqp://guest:guest@localhost:5672'),
    EMAIL_QUEUE_NAME: joi. string().default('email_notifications'),
    RABBITMQ_DLX_EXCHANGE: joi.string().default('notification.dlx'),
    EMAIL_DLQ_NAME: joi.string().default('email.dlq'),
    EMAIL_DLQ_ROUTING_KEY: joi.string().default('email.dlq'),
}).unknown();

// .env validation
const {error, value: env} = envSchema.validate(process.env);

if(error){
    logger.error(" Environment validation failed", {error: error});
    process.exit(1);
}

// Export valid variables
module.exports = {
    env: env.NODE_ENV,

    server: {
        port: env.PORT,
    },

    database: {
        url: env.DATABASE_URL,
    },

    smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },

    logger: {
        level: env.LOG_LEVEL,
    },

    rabbitmq: {
        url: env.RABBITMQ_URL,
        exchanges: {
            dlx: env.RABBITMQ_DLX_EXCHANGE,
        },
        queues: {
            email: env.EMAIL_QUEUE_NAME,
            emailDlq: env.EMAIL_DLQ_NAME,
        },
        routingKeys: {
            emailDlq: env.EMAIL_DLQ_ROUTING_KEY,
        },
        settings: {
            ttl: Number(process.env.RABBITMQ_EMAIL_TTL) || 24 * 60 * 60 * 1000,
            maxLength: Number(process.env.RABBITMQ_EMAIL_MAX_LENGTH) || 10000,
        }
    },
};