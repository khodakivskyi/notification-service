import { describe, it, expect } from 'vitest';
import {
  validateRequiredFields,
  isValidEmail,
  validateEmail,
  isValidUrl,
  validateUrl,
  isValidUuid,
  validateUuid,
} from '../helpers/index.js';
import { ValidationError } from '../exceptions/index.js';

describe('validation', () => {
  describe('validateRequiredFields', () => {
    it('does not throw when all required fields are present and non-empty', () => {
      const data = { email: 'a@b.com', name: 'John' };
      expect(() => validateRequiredFields(data, ['email', 'name'])).not.toThrow();
    });

    it('throws ValidationError when a required field is missing', () => {
      const data = { email: 'a@b.com' };
      expect(() => validateRequiredFields(data, ['email', 'name'])).toThrow(ValidationError);
      expect(() => validateRequiredFields(data, ['email', 'name'])).toThrow(/Missing required fields/);
    });

    it('throws ValidationError when a required field is empty string', () => {
      const data = { email: '', name: 'John' };
      expect(() => validateRequiredFields(data, ['email', 'name'])).toThrow(ValidationError);
    });

    it('throws ValidationError when a required field is null', () => {
      const data = { email: 'a@b.com', name: null };
      expect(() => validateRequiredFields(data, ['email', 'name'])).toThrow(ValidationError);
    });

    it('throws ValidationError when data is null', () => {
      expect(() => validateRequiredFields(null, ['email'])).toThrow(ValidationError);
    });

    it('error details contain missing field names', () => {
      try {
        validateRequiredFields({}, ['a', 'b', 'c']);
      } catch (e) {
        const err = e as ValidationError;
        expect(err.details).toEqual({ missing: { a: true, b: true, c: true } });
      }
    });
  });

  describe('isValidEmail', () => {
    it('returns true for valid email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('a@b.co')).toBe(true);
    });

    it('returns false for invalid email', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('no@')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(123)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('does not throw for valid email', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
    });

    it('throws ValidationError for invalid email', () => {
      expect(() => validateEmail('invalid')).toThrow(ValidationError);
      expect(() => validateEmail('invalid')).toThrow(/Invalid email address format/);
    });

    it('uses custom field name in error details', () => {
      try {
        validateEmail('bad', 'customField');
      } catch (e) {
        const err = e as ValidationError;
        expect(err.details?.field).toBe('customField');
      }
    });
  });

  describe('isValidUrl', () => {
    it('returns true for http and https URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
    });

    it('returns false for invalid URL', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('does not throw for valid http/https URL', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
    });

    it('throws ValidationError for invalid URL', () => {
      expect(() => validateUrl('invalid')).toThrow(ValidationError);
    });

    it('uses custom field name in error details', () => {
      try {
        validateUrl('x', 'callbackUrl');
      } catch (e) {
        const err = e as ValidationError;
        expect(err.details?.field).toBe('callbackUrl');
      }
    });
  });

  describe('isValidUuid', () => {
    it('returns true for valid UUID', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('returns false for invalid UUID', () => {
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid('not-uuid')).toBe(false);
      expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUuid(null)).toBe(false);
    });
  });

  describe('validateUuid', () => {
    it('does not throw for valid UUID', () => {
      expect(() => validateUuid('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    it('throws ValidationError for invalid UUID', () => {
      expect(() => validateUuid('invalid')).toThrow(ValidationError);
    });

    it('uses custom field name in error details', () => {
      try {
        validateUuid('x', 'userId');
      } catch (e) {
        const err = e as ValidationError;
        expect(err.details?.field).toBe('userId');
      }
    });
  });
});
