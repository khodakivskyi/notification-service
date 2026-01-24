const https = require('https');
const http = require('http');
const logger = require('../config/logger');

/**
 * POST JSON callback.
 * @param {string} callbackUrl
 * @param {any} data
 * @param {{ timeoutMs?: number, headers?: Record<string,string> }} [opts]
 * @returns {Promise<{ statusCode: number, body: string }>}
 */
async function callCallback(callbackUrl, data, opts = {}) {
    const {timeoutMs = 5000, headers = {}} = opts;

    const parsedUrl = new URL(callbackUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const postData = JSON.stringify(data);

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'notification-service/1.0',
            ...headers,
        },
        timeout: timeoutMs,
    }

    return await new Promise((resolve, reject) => {
        const req = client.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                const statusCode = res.statusCode || 0;

                if (statusCode >= 200 && statusCode < 300) {
                    logger.info('Callback called successfully', {callbackUrl, statusCode});
                } else {
                    logger.warn('Callback returned non-2xx status', {callbackUrl, statusCode});
                }

                resolve({statusCode, body});
            })
        })

        req.on('error', (error) => {
            logger.error('Callback request failed', {callbackUrl, error: error.message});
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            logger.warn('Callback request timeout', {callbackUrl});
            reject(new Error('Callback timeout'));
        });

        req.write(postData);
        req.end();
    });
}

module.exports = {callCallback};