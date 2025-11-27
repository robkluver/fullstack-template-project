/**
 * GET /users/:userId/notifications/:notificationId
 *
 * Gets a single notification by ID.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md (AP-GCAL-03)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getNotificationById,
  toNotification,
} from '../../infrastructure/storage/dynamodb/repositories/notificationRepository.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const notificationId = event.pathParameters?.notificationId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }
    if (!notificationId) {
      return errorResponse(400, 'MISSING_NOTIFICATION_ID', 'notificationId is required');
    }

    const record = await getNotificationById(userId, notificationId);

    if (!record) {
      return errorResponse(404, 'NOT_FOUND', 'Notification not found');
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: toNotification(record),
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getNotification:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch notification');
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
