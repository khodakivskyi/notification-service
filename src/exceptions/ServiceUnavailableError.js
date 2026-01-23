const BaseError = require('./BaseError');

/**
 * External service unavailable (SMTP, RabbitMQ, Database)
 * HTTP 503 Service Unavailable
 */
class ServiceUnavailableError extends BaseError {
    constructor(serviceName, originalError = null) {
        super('Service temporarily unavailable', 503, true);
        this.serviceName = serviceName;
        this.originalError = originalError?.message;
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                service: this.serviceName,
                ...(this.originalError && {originalError: this.originalError}),
                timestamp: this.timestamp,
            }
        };
    }
}

module.exports = ServiceUnavailableError;