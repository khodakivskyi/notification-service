import { BaseError } from './BaseError';

/**
 * Conflict
 * HTTP 409 Conflict
 */
export class ConflictError extends BaseError {
  public readonly field: string | null;

  constructor(message: string, field: string | null = null) {
    super(message, 409, true);
    this.field = field;
  }

  toJSON(): { error: { name: string; message: string; statusCode: number; field?: string; timestamp: string } } {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.field && { field: this.field }),
        timestamp: this.timestamp,
      },
    };
  }
}
