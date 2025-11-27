/**
 * Typed Application Errors Unit Tests
 *
 * Tests error classes, status codes, and JSON serialization.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md#5-error-handling
 */

import { describe, it, expect } from '@jest/globals';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
  GoogleOAuthError,
  TokenRefreshError,
  TokenExpiredError,
  SyncTokenInvalidError,
  GoogleApiError,
  NotConnectedError,
  ReauthRequiredError,
} from './errors.js';

describe('Typed Application Errors', () => {
  describe('NotFoundError', () => {
    it('should have statusCode 404', () => {
      const error = new NotFoundError('User');
      expect(error.statusCode).toBe(404);
    });

    it('should generate code from resource name', () => {
      const error = new NotFoundError('User');
      expect(error.code).toBe('USER_NOT_FOUND');
    });

    it('should handle multi-word resource names', () => {
      const error = new NotFoundError('Calendar Event');
      expect(error.code).toBe('CALENDAR_EVENT_NOT_FOUND');
    });

    it('should include id in message when provided', () => {
      const error = new NotFoundError('User', 'usr_123');
      expect(error.message).toBe("User with id 'usr_123' not found");
    });

    it('should have simple message without id', () => {
      const error = new NotFoundError('Resource');
      expect(error.message).toBe('Resource not found');
    });

    it('should serialize to JSON correctly', () => {
      const error = new NotFoundError('Event', 'evt_456');
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'EVENT_NOT_FOUND',
        message: "Event with id 'evt_456' not found",
      });
    });
  });

  describe('ValidationError', () => {
    it('should have statusCode 400', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
    });

    it('should have code VALIDATION_ERROR', () => {
      const error = new ValidationError('Invalid');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should store details if provided', () => {
      const details = {
        email: ['Invalid email format'],
        password: ['Too short', 'Missing uppercase'],
      };
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });

    it('should have undefined details if not provided', () => {
      const error = new ValidationError('Invalid');
      expect(error.details).toBeUndefined();
    });

    it('should include details in JSON serialization', () => {
      const error = new ValidationError('Invalid', { field: ['Error'] });
      const json = error.toJSON();

      expect(json).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: { field: ['Error'] },
      });
    });
  });

  describe('UnauthorizedError', () => {
    it('should have statusCode 401', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
    });

    it('should have default message and code', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Unauthorized');
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should accept custom message and code', () => {
      const error = new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
      expect(error.message).toBe('Token expired');
      expect(error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('ForbiddenError', () => {
    it('should have statusCode 403', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
    });

    it('should have code FORBIDDEN', () => {
      const error = new ForbiddenError();
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should have default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Access denied');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('You cannot edit this resource');
      expect(error.message).toBe('You cannot edit this resource');
    });
  });

  describe('ConflictError', () => {
    it('should have statusCode 409', () => {
      const error = new ConflictError('Conflict');
      expect(error.statusCode).toBe(409);
    });

    it('should have default code CONFLICT', () => {
      const error = new ConflictError('Resource exists');
      expect(error.code).toBe('CONFLICT');
    });

    it('should accept custom code', () => {
      const error = new ConflictError('Version mismatch', 'VERSION_CONFLICT');
      expect(error.code).toBe('VERSION_CONFLICT');
    });
  });

  describe('ExternalServiceError', () => {
    it('should have statusCode 502', () => {
      const error = new ExternalServiceError('API', 'Service unavailable');
      expect(error.statusCode).toBe(502);
    });

    it('should generate code from service name', () => {
      const error = new ExternalServiceError('stripe', 'Payment failed');
      expect(error.code).toBe('STRIPE_ERROR');
    });

    it('should accept custom code', () => {
      const error = new ExternalServiceError('api', 'Error', 'CUSTOM_CODE');
      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('should store service name', () => {
      const error = new ExternalServiceError('PayPal', 'Timeout');
      expect(error.service).toBe('PayPal');
    });
  });

  describe('GoogleOAuthError', () => {
    it('should have statusCode 502 (inherited)', () => {
      const error = new GoogleOAuthError('OAuth failed');
      expect(error.statusCode).toBe(502);
    });

    it('should have GOOGLE service', () => {
      const error = new GoogleOAuthError('Error');
      expect(error.service).toBe('GOOGLE');
    });

    it('should have default code GOOGLE_OAUTH_ERROR', () => {
      const error = new GoogleOAuthError('Failed');
      expect(error.code).toBe('GOOGLE_OAUTH_ERROR');
    });

    it('should accept custom code', () => {
      const error = new GoogleOAuthError('Error', 'CUSTOM_GOOGLE_ERROR');
      expect(error.code).toBe('CUSTOM_GOOGLE_ERROR');
    });
  });

  describe('TokenRefreshError', () => {
    it('should have correct message', () => {
      const error = new TokenRefreshError();
      expect(error.message).toBe('Failed to refresh access token');
    });

    it('should have code TOKEN_REFRESH_FAILED', () => {
      const error = new TokenRefreshError();
      expect(error.code).toBe('TOKEN_REFRESH_FAILED');
    });
  });

  describe('TokenExpiredError', () => {
    it('should have statusCode 401 (overridden)', () => {
      const error = new TokenExpiredError();
      expect(error.statusCode).toBe(401);
    });

    it('should have correct message', () => {
      const error = new TokenExpiredError();
      expect(error.message).toBe('Token expired and no refresh token available');
    });

    it('should have code TOKEN_EXPIRED_NO_REFRESH', () => {
      const error = new TokenExpiredError();
      expect(error.code).toBe('TOKEN_EXPIRED_NO_REFRESH');
    });
  });

  describe('SyncTokenInvalidError', () => {
    it('should have correct message', () => {
      const error = new SyncTokenInvalidError();
      expect(error.message).toBe('Sync token is invalid, full sync required');
    });

    it('should have code SYNC_TOKEN_INVALID', () => {
      const error = new SyncTokenInvalidError();
      expect(error.code).toBe('SYNC_TOKEN_INVALID');
    });
  });

  describe('GoogleApiError', () => {
    it('should store HTTP status', () => {
      const error = new GoogleApiError(429, 'Rate limited');
      expect(error.httpStatus).toBe(429);
    });

    it('should have code GOOGLE_API_ERROR', () => {
      const error = new GoogleApiError(500);
      expect(error.code).toBe('GOOGLE_API_ERROR');
    });

    it('should have default message', () => {
      const error = new GoogleApiError(500);
      expect(error.message).toBe('Google Calendar API error');
    });

    it('should accept custom message', () => {
      const error = new GoogleApiError(403, 'Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotConnectedError', () => {
    it('should have statusCode 400', () => {
      const error = new NotConnectedError();
      expect(error.statusCode).toBe(400);
    });

    it('should have code NOT_CONNECTED', () => {
      const error = new NotConnectedError();
      expect(error.code).toBe('NOT_CONNECTED');
    });

    it('should have default service in message', () => {
      const error = new NotConnectedError();
      expect(error.message).toBe('Google Calendar is not connected');
    });

    it('should accept custom service name', () => {
      const error = new NotConnectedError('Slack');
      expect(error.message).toBe('Slack is not connected');
    });
  });

  describe('ReauthRequiredError', () => {
    it('should have statusCode 401', () => {
      const error = new ReauthRequiredError();
      expect(error.statusCode).toBe(401);
    });

    it('should have code REAUTH_REQUIRED', () => {
      const error = new ReauthRequiredError();
      expect(error.code).toBe('REAUTH_REQUIRED');
    });

    it('should have default service in message', () => {
      const error = new ReauthRequiredError();
      expect(error.message).toBe('Please reconnect your Google Calendar');
    });

    it('should accept custom service name', () => {
      const error = new ReauthRequiredError('Dropbox');
      expect(error.message).toBe('Please reconnect your Dropbox');
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      const errors = [
        new NotFoundError('Test'),
        new ValidationError('Test'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError('Test'),
        new ExternalServiceError('Test', 'Test'),
        new GoogleOAuthError('Test'),
        new TokenRefreshError(),
        new TokenExpiredError(),
        new SyncTokenInvalidError(),
        new GoogleApiError(500),
        new NotConnectedError(),
        new ReauthRequiredError(),
      ];

      for (const error of errors) {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
      }
    });

    it('should have correct constructor name', () => {
      const error = new NotFoundError('Test');
      expect(error.name).toBe('NotFoundError');
    });

    it('should have stack trace', () => {
      const error = new ValidationError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });

  describe('toJSON serialization', () => {
    it('should serialize all error types correctly', () => {
      const errors: Array<{ error: AppError; expectedCode: string }> = [
        { error: new NotFoundError('Test'), expectedCode: 'TEST_NOT_FOUND' },
        { error: new ValidationError('Invalid'), expectedCode: 'VALIDATION_ERROR' },
        { error: new UnauthorizedError(), expectedCode: 'UNAUTHORIZED' },
        { error: new ForbiddenError(), expectedCode: 'FORBIDDEN' },
        { error: new ConflictError('Conflict'), expectedCode: 'CONFLICT' },
        { error: new NotConnectedError(), expectedCode: 'NOT_CONNECTED' },
        { error: new ReauthRequiredError(), expectedCode: 'REAUTH_REQUIRED' },
      ];

      for (const { error, expectedCode } of errors) {
        const json = error.toJSON();
        expect(json.code).toBe(expectedCode);
        expect(json.message).toBeTruthy();
        expect(typeof json.message).toBe('string');
      }
    });
  });
});
