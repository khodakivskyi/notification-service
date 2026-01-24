const BaseError = require('./BaseError');

/**
 * Forbidden (no rights)
 * HTTP 403 Forbidden
 */
class ForbiddenError extends BaseError {
    constructor(message = 'You do not have permission to access this resource') {
        super(message, 403, true);
    }
}

module.exports = ForbiddenError;