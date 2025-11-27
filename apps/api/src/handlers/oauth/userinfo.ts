/**
 * GET /oauth/userinfo
 *
 * OpenID Connect UserInfo endpoint
 * Returns the authenticated user's profile information.
 *
 * @see OpenID Connect Core 1.0 Section 5.3
 * @see docs/core/AUTH_STRATEGY.md
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { UserInfo } from '@nexus/shared';
import { verifyAccessToken } from '../../infrastructure/auth/jwt.js';
import { findUserById } from '../../infrastructure/storage/dynamodb/repositories/userRepository.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = event.headers['Authorization'] || event.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'invalid_token', 'Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    // Verify access token
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      return errorResponse(401, 'invalid_token', 'Invalid or expired access token');
    }

    // Get user from database
    const user = await findUserById(payload.sub);
    if (!user) {
      return errorResponse(401, 'invalid_token', 'User not found');
    }

    // Build UserInfo response (OpenID Connect standard claims)
    const userInfo: UserInfo = {
      sub: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.emailVerified,
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(userInfo),
    };
  } catch (error) {
    console.error('Error in userinfo handler:', error);
    return errorResponse(500, 'server_error', 'Internal server error');
  }
};

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}

function errorResponse(
  statusCode: number,
  error: string,
  errorDescription: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      'WWW-Authenticate': `Bearer error="${error}", error_description="${errorDescription}"`,
    },
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
  };
}
