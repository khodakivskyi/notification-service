import { BaseError } from './BaseError.js';

/**
 * Forbidden (no rights)
 * HTTP 403 Forbidden
 */
export class ForbiddenError extends BaseError {
  constructor(message: string = 'You do not have permission to access this resource') {
    super(message, 403, true);
  }
}
