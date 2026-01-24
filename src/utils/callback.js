const httpClient = require('../helpers/httpClient');
const logger = require('../config/logger');

/**
 * Call webhook callback
 * @param {string} callbackUrl
 * @param {object} data
 * @param {object} [options]
 * @returns {Promise<{statusCode: number, body: string}>}
 */
async function callCallback(callbackUrl, data, options = {}) {
    try {
        const response = await httpClient.post(callbackUrl, data, options);

        if (response.statusCode >= 200 && response.statusCode < 300) {
            logger.info('Callback executed successfully', {
                url: callbackUrl,
                statusCode: response.statusCode,
            });
        } else {
            logger.warn('Callback returned non-2xx status', {
                url: callbackUrl,
                statusCode: response.statusCode,
            });
        }

        return response;
    } catch (error) {
        logger.error('Callback failed', {url: callbackUrl, error: error.message});
        throw error;
    }
}

module.exports = {callCallback};