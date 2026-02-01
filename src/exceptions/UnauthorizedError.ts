import { BaseError } from './BaseError';

/**
 * UnauthorizedError (missing or invalid api key)
 * HTTP 401 Unauthorized
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string = 'Please provide valid api key') {
    super(message, 401, true);
  }
}