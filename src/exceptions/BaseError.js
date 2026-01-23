class BaseError extends Error{
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);

        this.name = this.constructor.name; // (ValidationError, NotFoundError, etc.)
        this.statusCode = statusCode; // HTTP status code
        this.isOperational = isOperational; // Is this an "expected" error
        this.timestamp = new Date().toISOString();

        // Stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON(){
        return{
            error: {
                name: this.name,
                message: this.message,
                statusCode: this.statusCode,
                timestamp: this.timestamp,
            }
        }
    }
}

module.exports = BaseError;