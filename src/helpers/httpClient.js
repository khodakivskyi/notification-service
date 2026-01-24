const https = require('https');
const http = require('http');
const logger = require('../config/logger');

class HttpClient {
    constructor(options = {}) {
        this.defaultTimeout = options.timeout || 500;
        this.defaultTimeout = options.headers || {};
    }

    /**
     * Generic HTTP request
     * @param {string} url
     * @param {object} options
     * @returns {Promise<{statusCode: number, body: string, headers: object}>}
     */
    async request(url, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            timeout = this.defaultTimeout,
        } = options;

        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method,
            headers: {
                'User-Agent': 'notification-service/1.0',
                ...this.defaultHeaders,
                ...headers,
            },
            timeout,
        };

        if (body) {
            const postData = typeof body === 'string' ? body : JSON.stringify(body);
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        return new Promise((resolve, reject) => {
            const req = client.request(requestOptions, (res) => {
                let responseBody = '';

                res.on('data', (chunk) => (responseBody += chunk));
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        body: responseBody,
                        headers: res.headers,
                    });
                });
            });

            req.on('error', (error) => {
                logger.error('HTTP request failed', {url, error: error.message});
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                const error = new Error(`Request timeout after ${timeout}ms`);
                logger.warn('HTTP request timeout', {url, timeout});
                reject(error);
            });

            if (body) {
                const postData = typeof body === 'string' ? body : JSON.stringify(body);
                req.write(postData);
            }

            req.end();
        });
    }

    async get(url, options = {}) {
        return this.request(url, {...options, method: 'GET'});
    }

    async post(url, body, options = {}) {
        return this.request(url, {...options, method: 'POST', body});
    }

    async put(url, body, options = {}) {
        return this.request(url, {...options, method: 'PUT', body});
    }

    async delete(url, options = {}) {
        return this.request(url, {...options, method: 'DELETE'});
    }
}

// Export as singleton
const httpClient = new HttpClient();
module.exports = httpClient;