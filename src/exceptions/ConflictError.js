const BaseError = require('./BaseError');

/**
 * Conflict
 * HTTP 409 Conflict
 */
class ConflictError extends BaseError {
    constructor(message, field = null) {
        super(message, 409, true);
        this.field = field;
    }

    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                ...(this.field && {field: this.field}),
                timestamp: this.timestamp,
            }
        };
    }
}

module.exports = ConflictError;