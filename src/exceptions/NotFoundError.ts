import { BaseError } from './BaseError';

/**
 * Resource not found
 * HTTP 404 Not Found
 */
export class NotFoundError extends BaseError {
  public readonly resource: string;
  public readonly identifier: string | null;

  constructor(resource: string, identifier: string | null = null) {
    super(`${resource} not found`, 404, true);
    this.resource = resource;
    this.identifier = identifier;
  }

  toJSON(): {
    error: {
      name: string;
      message: string;
      statusCode: number;
      resource: string;
      identifier?: string;
      timestamp: string;
    };
  } {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        resource: this.resource,
        ...(this.identifier && { identifier: this.identifier }),
        timestamp: this.timestamp,
      },
    };
  }
}
