/**
 * GET /oauth/google/authorize
 *
 * Generates a Google OAuth authorization URL for the user to grant calendar access.
 * Returns the URL that the frontend should redirect to.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomBytes } from 'crypto';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/google/callback';

// Scopes for read-only calendar access
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Google OAuth is not configured');
    }

    // Get userId from query params (required for state)
    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId query parameter is required');
    }

    // Generate state parameter for CSRF protection
    // Format: base64(userId:randomBytes)
    const randomState = randomBytes(16).toString('hex');
    const state = Buffer.from(`${userId}:${randomState}`).toString('base64url');

    // Build the authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
    authUrl.searchParams.set('state', state);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          authorizationUrl: authUrl.toString(),
          state,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in google authorize:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to generate authorization URL');
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
  code: string,
  message: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({
      data: null,
      error: { code, message },
    }),
  };
}
