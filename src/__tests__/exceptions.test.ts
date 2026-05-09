import { describe, it, expect } from 'vitest';
import {
  BaseError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
} from '../exceptions/index.js';


describe('exceptions', () => {
  describe('BaseError', () => {
    it('sets message, statusCode, isOperational, timestamp', () => {
      const err = new BaseError('Something failed', 500, true);
      expect(err.message).toBe('Something failed');
      expect(err.statusCode).toBe(500);
      expect(err.isOperational).toBe(true);
      expect(err.name).toBe('BaseError');
      expect(err.timestamp).toBeDefined();
      expect(typeof err.timestamp).toBe('string');
    });

    it('toJSON returns error object with name, message, statusCode, timestamp', () => {
      const err = new BaseError('Test', 400);
      const json = err.toJSON();
      expect(json.error).toEqual({
        name: 'BaseError',
        message: 'Test',
        statusCode: 400,
        timestamp: err.timestamp,
      });
    });
  });

  describe('ValidationError', () => {
    it('extends BaseError with statusCode 400', () => {
      const err = new ValidationError('Invalid input');
      expect(err).toBeInstanceOf(BaseError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Invalid input');
      expect(err.name).toBe('ValidationError');
    });

    it('includes details in toJSON when provided', () => {
      const err = new ValidationError('Missing fields', { missing: { email: true } });
      const json = err.toJSON();
      expect(json.error.details).toEqual({ missing: { email: true } });
    });
  });

  describe('NotFoundError', () => {
    it('sets resource and identifier', () => {
      const err = new NotFoundError('Notification', 'id-123');
      expect(err.message).toBe('Notification not found');
      expect(err.statusCode).toBe(404);
      expect(err.resource).toBe('Notification');
      expect(err.identifier).toBe('id-123');
      expect(err.name).toBe('NotFoundError');
    });

    it('toJSON includes resource and optional identifier', () => {
      const err = new NotFoundError('User', 'uuid');
      const json = err.toJSON();
      expect(json.error.resource).toBe('User');
      expect(json.error.identifier).toBe('uuid');
    });
  });

  describe('ForbiddenError', () => {
    it('has statusCode 403 and default message', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain('permission');
    });
  });

  describe('ConflictError', () => {
    it('has statusCode 409 and optional field', () => {
      const err = new ConflictError('Already exists', 'email');
      expect(err.statusCode).toBe(409);
      expect(err.field).toBe('email');
    });
  });

  describe('RateLimitError', () => {
    it('has statusCode 429 and retryAfter', () => {
      const err = new RateLimitError(60);
      expect(err.statusCode).toBe(429);
      expect(err.retryAfter).toBe(60);
      const json = err.toJSON();
      expect(json.error.retryAfter).toBe(60);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('has statusCode 503 and serviceName', () => {
      const err = new ServiceUnavailableError('SMTP', new Error('Connection refused'));
      expect(err.statusCode).toBe(503);
      expect(err.serviceName).toBe('SMTP');
      expect(err.originalError).toBe('Connection refused');
    });
  });
});
