const logger = require('../config/logger');

/**
 * Centralized error handling
 * This middleware is triggered when we call next(err)
 */
function errorHandler(error, req, res) {
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
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        },
    });
}

module.exports = errorHandler;