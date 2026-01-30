import { BaseError } from './BaseError';

/**
 * Rate limit exceeded
 * HTTP 429 Too Many Requests
 */
export class RateLimitError extends BaseError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded. Please try again later.', 429, true);
    this.retryAfter = retryAfter; // After how many seconds can it be repeated
  }

  toJSON(): {
    error: {
      name: string;
      message: string;
      statusCode: number;
      retryAfter: number;
      timestamp: string;
    };
  } {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        retryAfter: this.retryAfter,
        timestamp: this.timestamp,
      },
    };
  }
}
