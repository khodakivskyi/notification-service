const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.errors({stack: true}),
        winston.format.json()
    ),
    defaultMeta: {service: 'notification-service'},
    transports: [
        // Development console logs
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({timestamp, level, message, ...meta}) => {
                    // Output:  "2026-01-17 14:30:45 [info]:  Server started {port:  3001}"
                    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                }),
            ),
        }),

        // File logs (only errors)
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),

        // File logs (all levels)
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ]
});

module.exports = logger;
