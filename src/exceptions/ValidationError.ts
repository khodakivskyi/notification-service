import { BaseError } from './BaseError';

/**
 * Validation error (invalid data from client)
 * HTTP 400 Bad Request
 */
export class ValidationError extends BaseError {
  public readonly details: any;

  constructor(message: string, details: any = null) {
    super(message, 400, true);
    this.details = details;
  }

  toJSON(): {
    error: { name: string; message: string; statusCode: number; details?: any; timestamp: string };
  } {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
        timestamp: this.timestamp,
      },
    };
  }
}
