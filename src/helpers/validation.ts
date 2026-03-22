import { ValidationError } from '../exceptions';

/**
 * Validate required fields in data object
 * @param data - Data object to validate
 * @param requiredFields - Array of required field names
 * @throws {ValidationError} If any required field is missing
 */
export function validateRequiredFields(data: unknown, requiredFields: string[]): void {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('Invalid data', { missing: {} });
  }

  const obj = data as Record<string, unknown>;

  const missing: string[] = [];
  const missingDetails: Record<string, boolean> = {};

  for (const field of requiredFields) {
    if (!data || obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
      missingDetails[field] = true;
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, {
      missing: missingDetails,
    });
  }
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: unknown): email is string {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate email format and throw error if invalid
 * @param email - Email address to validate
 * @param fieldName - Field name for error message
 * @throws {ValidationError} If email format is invalid
 */
export function validateEmail(email: unknown, fieldName: string = 'email'): asserts email is string {
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email address format', {
      field: fieldName,
      value: email,
    });
  }
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if URL format is valid
 */
export function isValidUrl(url: unknown): url is string {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate URL format and throw error if invalid
 * @param url - URL to validate
 * @param fieldName - Field name for error message
 * @throws {ValidationError} If URL format is invalid
 */
export function validateUrl(url: unknown, fieldName: string = 'url'): asserts url is string {
  if (!isValidUrl(url)) {
    throw new ValidationError('Invalid URL format', {
      field: fieldName,
      value: url,
    });
  }
}

/**
 * Validate UUID format
 * @param uuid - UUID to validate
 * @returns True if UUID format is valid
 */
export function isValidUuid(uuid: unknown): uuid is string {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate UUID format and throw error if invalid
 * @param uuid - UUID to validate
 * @param fieldName - Field name for error message
 * @throws {ValidationError} If UUID format is invalid
 */
export function validateUuid(uuid: unknown, fieldName: string = 'id'): asserts uuid is string {
  if (!isValidUuid(uuid)) {
    throw new ValidationError('Invalid UUID format', {
      field: fieldName,
      value: uuid,
    });
  }
}
