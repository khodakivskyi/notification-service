import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

// Define the schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  API_KEY: Joi.string().min(32).allow('').optional(),

  DATABASE_URL: Joi.string().uri().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_USER: Joi.string().email().required(),
  SMTP_PASS: Joi.string().required(),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  RATE_LIMIT_ENABLED: Joi.bool().truthy('true').falsy('false').default(false),
  REDIS_URL: Joi.string(),
  RATE_LIMIT_POINTS: Joi.string().allow(''),
  RATE_LIMIT_DURATION: Joi.string().allow(''),
  RATE_LIMIT_BLOCK_DURATION: Joi.string().allow(''),

  RABBITMQ_URL: Joi.string().uri().default('amqp://guest:guest@localhost:5672'),
  EMAIL_QUEUE_NAME: Joi.string().default('email_notifications'),
  RABBITMQ_DLX_EXCHANGE: Joi.string().trim().min(1).default('notification.dlx'),
  EMAIL_DLQ_NAME: Joi.string().trim().min(1).default('email.dlq'),
  EMAIL_DLQ_ROUTING_KEY: Joi.string().trim().min(1).default('email.dlq'),
  EMAIL_RETRY_QUEUE_NAME: Joi.string().trim().min(1).default('email.retry'),
}).unknown();

// .env validation
const { error, value: env } = envSchema.validate(process.env);

if (error) {
  console.error('Environment validation failed', { error: error });
  process.exit(1);
}

// Export valid variables
export default {
  env: env.NODE_ENV,
  apiKey: env.API_KEY,

  server: {
    port: env.PORT,
  },

  rateLimiting: {
    rateLimitEnabled: env.RATE_LIMIT_ENABLED,
    redisUrl: env.REDIS_URL,
    rateLimitPoints: Number(env.RATE_LIMIT_POINTS) || 100,
    rateLimitDuration: Number(env.RATE_LIMIT_DURATION) || 60,
    rateLimitBlockDuration: Number(env.RATE_LIMIT_BLOCK_DURATION) || 10,
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
      emailRetry: env.EMAIL_RETRY_QUEUE_NAME,
      emailDlq: env.EMAIL_DLQ_NAME,
    },
    routingKeys: {
      emailDlq: env.EMAIL_DLQ_ROUTING_KEY,
    },
    settings: {
      ttl: Number(process.env.RABBITMQ_EMAIL_TTL) || 24 * 60 * 60 * 1000,
      maxLength: Number(process.env.RABBITMQ_EMAIL_MAX_LENGTH) || 10000,
    },
  },
};
