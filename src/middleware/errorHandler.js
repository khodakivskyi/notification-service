const logger = require('../config/logger');
const config = require('../config/env');

/**
 * Centralized error handling
 * This middleware is triggered when we call next(err)
 */
function errorHandler(error, req, res, next) {
    logger.error('Request error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
        body: req.body,
    });

    const statusCode = error.statusCode || error.status || 500;

    res.status(statusCode).json({
        error: {
            message: error.message || 'Internal Server Error',
            ...(config.env === 'development' && { stack: error.stack }),
        },
    });
}

module.exports = errorHandler;