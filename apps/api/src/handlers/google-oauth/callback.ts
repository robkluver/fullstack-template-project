/**
 * POST /oauth/google/callback
 *
 * Handles the OAuth callback from Google after user grants access.
 * Exchanges the authorization code for tokens and stores them.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import 'reflect-metadata';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from '../../di/container.js';
import { ConnectGoogleCalendar } from '../../application/usecases/ConnectGoogleCalendar.js';
import { googleCallbackSchema } from '../../lib/validation.js';
import { successResponse, handleApiError, errorResponse } from '../../lib/apiResponse.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/google/callback';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Check configuration
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return errorResponse(500, 'CONFIGURATION_ERROR', 'Google OAuth is not configured');
    }

    // 1. Validate Input (Contract)
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'INVALID_REQUEST', 'Invalid request body');
    }

    const { code, state } = googleCallbackSchema.parse(body);

    // 2. Resolve Dependency
    const useCase = container.resolve(ConnectGoogleCalendar);

    // 3. Execute Business Logic
    const result = await useCase.execute({
      code,
      state,
      redirectUri: GOOGLE_REDIRECT_URI,
    });

    // 4. Return Standard Response
    return successResponse(result, 200);
  } catch (error) {
    // 5. Centralized Error Handling
    return handleApiError(error);
  }
};
