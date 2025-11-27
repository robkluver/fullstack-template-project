/**
 * Authentication Middleware
 *
 * Extracts and validates JWT access tokens from requests.
 * Attaches user context to the event for downstream handlers.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { verifyAccessToken } from '../infrastructure/auth/jwt.js';
import type { AccessTokenPayload } from '@nexus/shared';

// Extend the event type to include authenticated user context
export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  auth: AccessTokenPayload;
}

export interface AuthResult {
  success: true;
  payload: AccessTokenPayload;
}

export interface AuthError {
  success: false;
  statusCode: number;
  error: string;
  errorDescription: string;
}

/**
 * Authenticate a request by validating the Bearer token
 */
export async function authenticate(
  event: APIGatewayProxyEvent
): Promise<AuthResult | AuthError> {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];

  if (!authHeader) {
    return {
      success: false,
      statusCode: 401,
      error: 'invalid_token',
      errorDescription: 'Missing Authorization header',
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      statusCode: 401,
      error: 'invalid_token',
      errorDescription: 'Authorization header must use Bearer scheme',
    };
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    return { success: true, payload };
  } catch (error) {
    // Check if it's an expiration error
    if (error instanceof Error && error.message.includes('exp')) {
      return {
        success: false,
        statusCode: 401,
        error: 'invalid_token',
        errorDescription: 'Access token has expired',
      };
    }

    return {
      success: false,
      statusCode: 401,
      error: 'invalid_token',
      errorDescription: 'Invalid access token',
    };
  }
}

/**
 * Build a 401 error response for authentication failures
 */
export function authErrorResponse(authError: AuthError) {
  return {
    statusCode: authError.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer error="${authError.error}", error_description="${authError.errorDescription}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({
      error: authError.error,
      error_description: authError.errorDescription,
    }),
  };
}

/**
 * Higher-order function to wrap handlers with authentication
 */
export function withAuth<TResult>(
  handler: (event: AuthenticatedEvent) => Promise<TResult>
) {
  return async (event: APIGatewayProxyEvent): Promise<TResult | ReturnType<typeof authErrorResponse>> => {
    const authResult = await authenticate(event);

    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    // Attach auth payload to event
    const authenticatedEvent = event as unknown as AuthenticatedEvent;
    authenticatedEvent.auth = authResult.payload;

    return handler(authenticatedEvent);
  };
}
