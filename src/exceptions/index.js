/**
 * Centralized export for all custom exceptions
 */
module.exports = {
    BaseError: require('./BaseError'),
    ValidationError: require('./ValidationError'),
    NotFoundError: require('./NotFoundError'),
    ServiceUnavailableError: require('./ServiceUnavailableError'),
    RateLimitError: require('./RateLimitError'),
    ConflictError: require('./ConflictError'),
    ForbiddenError: require('./ForbiddenError'),
};