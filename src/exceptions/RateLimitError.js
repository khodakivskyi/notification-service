const BaseError = require('./BaseError');

/**
 * Перевищено rate limit
 * HTTP 429 Too Many Requests
 */
class RateLimitError extends BaseError {
    constructor(retryAfter = 60) {
        super('Rate limit exceeded. Please try again later.', 429, true);
        this.retryAfter = retryAfter; // After how many seconds can it be repeated
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                retryAfter: this.retryAfter,
                timestamp: this.timestamp,
            }
        };
    }
}

module.exports = RateLimitError;