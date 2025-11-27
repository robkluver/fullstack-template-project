/**
 * Typed Application Errors
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md#5-error-handling
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code: string;

  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`);
    this.code = `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly details?: Record<string, string[]>;

  constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code: string;

  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message);
    this.code = code;
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code: string;

  constructor(message: string, code: string = 'CONFLICT') {
    super(message);
    this.code = code;
  }
}

export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly code: string;
  readonly service: string;

  constructor(service: string, message: string, code?: string) {
    super(message);
    this.service = service;
    this.code = code || `${service.toUpperCase()}_ERROR`;
  }
}

// Google-specific errors
export class GoogleOAuthError extends ExternalServiceError {
  constructor(message: string, code: string = 'GOOGLE_OAUTH_ERROR') {
    super('GOOGLE', message, code);
  }
}

export class TokenRefreshError extends GoogleOAuthError {
  constructor() {
    super('Failed to refresh access token', 'TOKEN_REFRESH_FAILED');
  }
}

export class TokenExpiredError extends GoogleOAuthError {
  readonly statusCode = 401;

  constructor() {
    super('Token expired and no refresh token available', 'TOKEN_EXPIRED_NO_REFRESH');
  }
}

export class SyncTokenInvalidError extends GoogleOAuthError {
  constructor() {
    super('Sync token is invalid, full sync required', 'SYNC_TOKEN_INVALID');
  }
}

export class GoogleApiError extends GoogleOAuthError {
  readonly httpStatus: number;

  constructor(httpStatus: number, message: string = 'Google Calendar API error') {
    super(message, 'GOOGLE_API_ERROR');
    this.httpStatus = httpStatus;
  }
}

export class NotConnectedError extends AppError {
  readonly statusCode = 400;
  readonly code = 'NOT_CONNECTED';

  constructor(service: string = 'Google Calendar') {
    super(`${service} is not connected`);
  }
}

export class ReauthRequiredError extends AppError {
  readonly statusCode = 401;
  readonly code = 'REAUTH_REQUIRED';

  constructor(service: string = 'Google Calendar') {
    super(`Please reconnect your ${service}`);
  }
}
