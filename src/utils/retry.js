const retry = require('async-retry');
const logger = require('../config/logger');

/**
 * Wrapper for retry logic
 * @param {Function} fn - Async func to process
 * @param {object} options - Retry options
 */
async function withRetry(fn, options = {}) {
    const defaultOptions = {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        factor: 2,
        onRetry: (error, attempt) => {
            logger.warn('Retrying operation', {
                attempt,
                error: error.message
            });
        },
    };

    return retry(
        async (bail) =>{
            try {
                return await fn();
            }
            catch (error) {
                // If it's a fatal error, do not retry
                if (error. responseCode >= 400 && error.responseCode < 500) {
                    logger.error('Client error, not retrying', { error: error.message });
                    bail(error);
                    return;
                }

                throw error;
            }
        },
        {...defaultOptions, ...options}
    );
}

module.exports = {withRetry};