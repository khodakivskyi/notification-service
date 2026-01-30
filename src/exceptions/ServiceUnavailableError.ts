import { BaseError } from './BaseError';

/**
 * External service unavailable (SMTP, RabbitMQ, Database)
 * HTTP 503 Service Unavailable
 */
export class ServiceUnavailableError extends BaseError {
  public readonly serviceName: string;
  public readonly originalError: string | undefined;

  constructor(serviceName: string, originalError: Error | null = null) {
    super('Service temporarily unavailable', 503, true);
    this.serviceName = serviceName;
    this.originalError = originalError?.message;
  }

  toJSON(): {
    error: {
      name: string;
      message: string;
      statusCode: number;
      service: string;
      originalError?: string;
      timestamp: string;
    };
  } {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        service: this.serviceName,
        ...(this.originalError && { originalError: this.originalError }),
        timestamp: this.timestamp,
      },
    };
  }
}
