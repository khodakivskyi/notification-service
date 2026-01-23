const BaseError = require('./BaseError');

/**
 * Resource not found
 * HTTP 404 Not Found
 */
class NotFoundError extends BaseError {
    constructor(resource, identifier = null) {
        super(`${resource} not found`, 404, true);
        this.resource = resource;
        this.identifier = identifier;
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                resource: this.resource,
                ...(this.identifier && {identifier: this.identifier}),
                timestamp: this.timestamp,
            }
        };
    }
}

module.exports = NotFoundError;