/**
 * POST /oauth/revoke
 *
 * OAuth 2.0 token revocation endpoint
 *
 * @see RFC 7009 - OAuth 2.0 Token Revocation
 * @see docs/core/AUTH_STRATEGY.md
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RevokeRequestSchema } from '@nexus/shared';
import { verifyRefreshToken } from '../../infrastructure/auth/jwt.js';
import { revokeRefreshToken } from '../../infrastructure/storage/dynamodb/repositories/refreshTokenRepository.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    let body: unknown;
    const contentType = event.headers['Content-Type'] || event.headers['content-type'] || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries(new URLSearchParams(event.body || ''));
    } else {
      try {
        body = JSON.parse(event.body || '{}');
      } catch {
        return errorResponse(400, 'invalid_request', 'Invalid request body');
      }
    }

    // Validate request
    const parseResult = RevokeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'invalid_request', parseResult.error.message);
    }

    const { token, token_type_hint } = parseResult.data;

    // Attempt to revoke the token
    // Per RFC 7009, we should return 200 even if the token doesn't exist
    try {
      if (token_type_hint === 'access_token') {
        // Access tokens are stateless JWTs - we can't truly revoke them
        // They will expire naturally. In a production system, you might
        // want to add them to a blocklist.
        // For now, we just return success.
      } else {
        // Assume it's a refresh token
        // Try to decode it to get the jti
        const payload = await verifyRefreshToken(token);
        await revokeRefreshToken(payload.jti);
      }
    } catch {
      // Token might be invalid or already revoked - that's fine per RFC 7009
    }

    // Always return 200 per RFC 7009
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    };
  } catch (error) {
    console.error('Error in revoke handler:', error);
    return errorResponse(500, 'server_error', 'Internal server error');
  }
};

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Cache-Control': 'no-store',
  };
}

function errorResponse(
  statusCode: number,
  error: string,
  errorDescription: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({
      error,
      error_description: errorDescription,
    }),
  };
}
