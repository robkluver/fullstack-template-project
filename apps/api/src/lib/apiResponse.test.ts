/**
 * API Response Helpers Unit Tests
 *
 * Tests standardized response formatting and error handling.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import { successResponse, errorResponse, handleApiError } from './apiResponse.js';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotConnectedError,
  ReauthRequiredError,
} from './errors.js';

describe('API Response Helpers', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successResponse', () => {
    it('should return 200 with data payload', () => {
      const data = { id: '123', name: 'Test' };

      const result = successResponse(data);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data).toEqual(data);
      expect(body.error).toBeNull();
    });

    it('should return custom status code', () => {
      const data = { created: true };

      const result = successResponse(data, 201);

      expect(result.statusCode).toBe(201);
    });

    it('should include CORS headers', () => {
      const result = successResponse({ test: true });

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
    });

    it('should set error to null', () => {
      const result = successResponse({ data: 'value' });

      const body = JSON.parse(result.body);
      expect(body.error).toBeNull();
    });

    it('should handle null data', () => {
      const result = successResponse(null);

      const body = JSON.parse(result.body);
      expect(body.data).toBeNull();
    });

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }];

      const result = successResponse(data);

      const body = JSON.parse(result.body);
      expect(body.data).toEqual(data);
    });
  });

  describe('errorResponse', () => {
    it('should return error response with code and message', () => {
      const result = errorResponse(400, 'BAD_REQUEST', 'Invalid input');

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.data).toBeNull();
      expect(body.error).toEqual({
        code: 'BAD_REQUEST',
        message: 'Invalid input',
      });
    });

    it('should include CORS headers', () => {
      const result = errorResponse(500, 'ERROR', 'Something failed');

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      });
    });

    it('should set data to null', () => {
      const result = errorResponse(404, 'NOT_FOUND', 'Resource not found');

      const body = JSON.parse(result.body);
      expect(body.data).toBeNull();
    });
  });

  describe('handleApiError', () => {
    describe('ZodError handling', () => {
      it('should handle ZodError with field details', () => {
        const schema = z.object({
          email: z.string().email(),
          age: z.number().min(0),
        });

        let zodError: z.ZodError;
        try {
          schema.parse({ email: 'invalid', age: -5 });
        } catch (e) {
          zodError = e as z.ZodError;
        }

        const result = handleApiError(zodError!);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe('Invalid request data');
        expect(body.error.details).toBeDefined();
        expect(body.error.details.email).toBeDefined();
        expect(body.error.details.age).toBeDefined();
      });

      it('should handle nested path in ZodError', () => {
        const schema = z.object({
          user: z.object({
            profile: z.object({
              name: z.string().min(1),
            }),
          }),
        });

        let zodError: z.ZodError;
        try {
          schema.parse({ user: { profile: { name: '' } } });
        } catch (e) {
          zodError = e as z.ZodError;
        }

        const result = handleApiError(zodError!);

        const body = JSON.parse(result.body);
        expect(body.error.details['user.profile.name']).toBeDefined();
      });

      it('should aggregate multiple errors for same field', () => {
        const schema = z.object({
          password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase'),
        });

        let zodError: z.ZodError;
        try {
          schema.parse({ password: 'short' });
        } catch (e) {
          zodError = e as z.ZodError;
        }

        const result = handleApiError(zodError!);

        const body = JSON.parse(result.body);
        expect(body.error.details.password.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('AppError handling', () => {
      it('should handle ValidationError with details', () => {
        const error = new ValidationError('Validation failed', {
          email: ['Invalid email format'],
          name: ['Name is required'],
        });

        const result = handleApiError(error);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe('Validation failed');
        expect(body.error.details).toEqual({
          email: ['Invalid email format'],
          name: ['Name is required'],
        });
      });

      it('should handle NotFoundError', () => {
        const error = new NotFoundError('User', 'usr_123');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('USER_NOT_FOUND');
        expect(body.error.message).toBe("User with id 'usr_123' not found");
      });

      it('should handle UnauthorizedError', () => {
        const error = new UnauthorizedError('Invalid token', 'INVALID_TOKEN');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(401);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('INVALID_TOKEN');
        expect(body.error.message).toBe('Invalid token');
      });

      it('should handle ForbiddenError', () => {
        const error = new ForbiddenError('You cannot access this resource');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(403);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('FORBIDDEN');
      });

      it('should handle ConflictError', () => {
        const error = new ConflictError('Resource already exists', 'DUPLICATE');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(409);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('DUPLICATE');
      });

      it('should handle NotConnectedError', () => {
        const error = new NotConnectedError('Google Calendar');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('NOT_CONNECTED');
      });

      it('should handle ReauthRequiredError', () => {
        const error = new ReauthRequiredError('Google Calendar');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(401);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('REAUTH_REQUIRED');
      });
    });

    describe('generic Error handling', () => {
      it('should handle generic Error as 500', () => {
        const error = new Error('Something went wrong');

        const result = handleApiError(error);

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('Something went wrong');
      });
    });

    describe('unknown error handling', () => {
      it('should handle unknown error type as 500', () => {
        const result = handleApiError('string error');

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('An unexpected error occurred');
      });

      it('should handle null as 500', () => {
        const result = handleApiError(null);

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.error.code).toBe('INTERNAL_ERROR');
      });

      it('should handle undefined as 500', () => {
        const result = handleApiError(undefined);

        expect(result.statusCode).toBe(500);
      });

      it('should handle object without Error prototype as 500', () => {
        const result = handleApiError({ message: 'custom object' });

        expect(result.statusCode).toBe(500);
      });
    });

    describe('logging', () => {
      it('should log error to console', () => {
        const error = new Error('Test error');

        handleApiError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', error);
      });
    });

    describe('CORS headers', () => {
      it('should include CORS headers in all error responses', () => {
        const errors = [
          new ValidationError('Invalid'),
          new NotFoundError('Resource'),
          new Error('Generic'),
          'unknown error',
        ];

        for (const error of errors) {
          const result = handleApiError(error);
          expect(result.headers).toEqual({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          });
        }
      });
    });
  });
});
