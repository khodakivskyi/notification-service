const logger = require('./logger');
const joi = require('joi');

// Define the schema for environment variables
const envSchema = joi.object({
    NODE_ENV: joi.string()
        .valid('development', 'production', 'test')
        .default('development'),

    PORT: joi.number().default(3000),

    SMTP_HOST:  joi.string().required(),
    SMTP_PORT: joi.number().required(),
    SMTP_USER: joi.string().email().required(),
    SMTP_PASS: joi.string().required(),

    //DATABASE_URL: joi.string().uri().required(),

    LOG_LEVEL: joi.string()
        .valid('error', 'warn', 'info', 'debug')
        .default('info'),
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

    smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },

    logger: {
        level: env.LOG_LEVEL,
    },
};