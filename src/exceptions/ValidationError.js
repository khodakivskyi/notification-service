const BaseError = require('./BaseError');

/**
 * Validation error (invalid data from client)
 * HTTP 400 Bad Request
 */
class ValidationError extends BaseError{
    constructor(message, details = null) {
        super(message, 400, true);
        this.details = details;
    }

    toJSON() {
        return {
            error : {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                ...(this.details && {details: this.details}),
                timestamp: this.timestamp,
            }
        }
    }
}

module.exports = ValidationError;