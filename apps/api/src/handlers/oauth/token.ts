/**
 * POST /oauth/token
 *
 * OAuth 2.0 token endpoint supporting:
 * - authorization_code grant (with PKCE)
 * - refresh_token grant
 * - password grant (dev/testing only)
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TokenRequestSchema } from '@nexus/shared';
import type { TokenResponse } from '@nexus/shared';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  TOKEN_EXPIRY,
} from '../../infrastructure/auth/jwt.js';
import { verifyPassword } from '../../infrastructure/auth/password.js';
import {
  findUserByEmail,
  findUserById,
} from '../../infrastructure/storage/dynamodb/repositories/userRepository.js';
import {
  storeRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
} from '../../infrastructure/storage/dynamodb/repositories/refreshTokenRepository.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body (form-urlencoded or JSON)
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
    const parseResult = TokenRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'invalid_request', parseResult.error.message);
    }

    const request = parseResult.data;

    // Handle different grant types
    switch (request.grant_type) {
      case 'password':
        return handlePasswordGrant(request.username, request.password);

      case 'refresh_token':
        return handleRefreshTokenGrant(request.refresh_token);

      case 'authorization_code':
        return handleAuthorizationCodeGrant(request.code, request.code_verifier);

      default:
        return errorResponse(400, 'unsupported_grant_type', 'Grant type not supported');
    }
  } catch (error) {
    console.error('Error in token handler:', error);
    return errorResponse(500, 'server_error', 'Internal server error');
  }
};

/**
 * Handle password grant (for testing/dev)
 */
async function handlePasswordGrant(
  email: string,
  password: string
): Promise<APIGatewayProxyResult> {
  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    return errorResponse(401, 'invalid_grant', 'Invalid credentials');
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return errorResponse(401, 'invalid_grant', 'Invalid credentials');
  }

  // Issue tokens
  return issueTokens(user.id, user.email, user.roles);
}

/**
 * Handle refresh token grant
 */
async function handleRefreshTokenGrant(
  refreshToken: string
): Promise<APIGatewayProxyResult> {
  try {
    // Verify the refresh token JWT
    const payload = await verifyRefreshToken(refreshToken);

    // Check if token is still valid in database (not revoked)
    const isValid = await isRefreshTokenValid(payload.jti);
    if (!isValid) {
      return errorResponse(401, 'invalid_grant', 'Refresh token has been revoked');
    }

    // Revoke the old refresh token (one-time use)
    await revokeRefreshToken(payload.jti);

    // Get user to ensure they still exist
    const user = await findUserById(payload.sub);
    if (!user) {
      return errorResponse(401, 'invalid_grant', 'User not found');
    }

    // Issue new tokens
    return issueTokens(user.id, user.email, user.roles);
  } catch (error) {
    // JWT verification failed
    return errorResponse(401, 'invalid_grant', 'Invalid refresh token');
  }
}

/**
 * Handle authorization code grant (PKCE)
 */
async function handleAuthorizationCodeGrant(
  _code: string,
  _codeVerifier: string
): Promise<APIGatewayProxyResult> {
  // TODO: Implement authorization code flow
  // This requires storing authorization codes in DynamoDB with code_challenge
  return errorResponse(
    501,
    'not_implemented',
    'Authorization code grant not yet implemented. Use password grant for testing.'
  );
}

/**
 * Issue access and refresh tokens
 */
async function issueTokens(
  userId: string,
  email: string,
  roles: string[]
): Promise<APIGatewayProxyResult> {
  // Sign access token
  const accessToken = await signAccessToken({ userId, email, roles });

  // Sign and store refresh token
  const { token: refreshTokenValue, jti, expiresAt } = await signRefreshToken(userId);
  await storeRefreshToken({ jti, userId, expiresAt });

  const response: TokenResponse = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TOKEN_EXPIRY.ACCESS_TOKEN_SECONDS,
    refresh_token: refreshTokenValue,
  };

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify(response),
  };
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
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
