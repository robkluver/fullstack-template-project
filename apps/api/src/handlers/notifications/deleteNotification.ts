/**
 * DELETE /users/:userId/notifications/:notificationId
 *
 * Deletes a notification.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  deleteNotification,
  getNotificationById,
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

    // Check if notification exists
    const existing = await getNotificationById(userId, notificationId);
    if (!existing) {
      return errorResponse(404, 'NOT_FOUND', 'Notification not found');
    }

    // Delete notification
    await deleteNotification(userId, notificationId);

    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete notification');
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
