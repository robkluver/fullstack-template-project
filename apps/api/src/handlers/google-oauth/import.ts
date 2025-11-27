/**
 * POST /users/:userId/google-calendar/import
 *
 * Triggers an import of events from Google Calendar.
 * Supports incremental sync and conflict detection.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import 'reflect-metadata';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from '../../di/container.js';
import { ImportGoogleCalendarEvents } from '../../application/usecases/ImportGoogleCalendarEvents.js';
import { userIdParamSchema } from '../../lib/validation.js';
import { successResponse, handleApiError } from '../../lib/apiResponse.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Validate Input (Contract)
    const { userId } = userIdParamSchema.parse(event.pathParameters);

    // 2. Resolve Dependency
    const useCase = container.resolve(ImportGoogleCalendarEvents);

    // 3. Execute Business Logic
    const result = await useCase.execute(userId);

    // 4. Return Standard Response
    return successResponse(result, 200);
  } catch (error) {
    // 5. Centralized Error Handling
    return handleApiError(error);
  }
};
