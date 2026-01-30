/**
 * Base error class for all custom errors
 */
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);

    this.name = this.constructor.name; // (ValidationError, NotFoundError, etc.)
    this.statusCode = statusCode; // HTTP status code
    this.isOperational = isOperational; // Is this an "expected" error
    this.timestamp = new Date().toISOString();

    // Stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): { error: { name: string; message: string; statusCode: number; timestamp: string } } {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
      },
    };
  }
}
