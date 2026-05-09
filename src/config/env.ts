import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

// Define the schema for environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  API_KEY: Joi.string().min(32).allow('').optional(),

  DATABASE_URL: Joi.string().uri().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_USER: Joi.string().email().required(),
  SMTP_PASS: Joi.string().required(),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  RATE_LIMIT_ENABLED: Joi.bool().truthy('true').falsy('false').default(false),
  REDIS_URL: Joi.string().uri().optional()
    .when('RATE_LIMIT_ENABLED', {
      is: true,
      then: Joi.string().uri().required(),
    }),
  RATE_LIMIT_POINTS: Joi.number().integer().min(1).default(100),
  RATE_LIMIT_DURATION: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_BLOCK_DURATION: Joi.number().integer().min(1).default(60),

  RABBITMQ_URL: Joi.string().uri().required(),
  OUTBOUND_QUEUE_NAME: Joi.string().default('email_notifications'),
  RABBITMQ_DLX_EXCHANGE: Joi.string().trim().min(1).default('notification.dlx'),
  OUTBOUND_DLQ_NAME: Joi.string().trim().min(1).default('email.dlq'),
  OUTBOUND_DLQ_ROUTING_KEY: Joi.string().trim().min(1).default('email.dlq'),
  OUTBOUND_RETRY_QUEUE_NAME: Joi.string().trim().min(1).default('email.retry'),
  RABBITMQ_OUTBOUND_TTL: Joi.number().integer().min(1000).default(300000),
  RABBITMQ_OUTBOUND_MAX_LENGTH: Joi.number().integer().min(1).default(10000),
}).unknown();

// .env validation
const { error, value: env } = envSchema.validate(process.env);

if (error) {
  console.error('Environment validation failed', { error: error });
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
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
    rateLimitPoints: env.RATE_LIMIT_POINTS,
    rateLimitDuration: env.RATE_LIMIT_DURATION,
    rateLimitBlockDuration: env.RATE_LIMIT_BLOCK_DURATION,
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
      outbound: env.OUTBOUND_QUEUE_NAME,
      outboundRetry: env.OUTBOUND_RETRY_QUEUE_NAME,
      outboundDlq: env.OUTBOUND_DLQ_NAME,
    },
    routingKeys: {
      outboundDlq: env.OUTBOUND_DLQ_ROUTING_KEY,
    },
    settings: {
      outboundTtl: env.RABBITMQ_OUTBOUND_TTL,
      outboundMaxLength: env.RABBITMQ_OUTBOUND_MAX_LENGTH,
    },
  },
};
