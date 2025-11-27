/**
 * GET /users/:userId/notifications
 *
 * Lists notifications for a user with unread count.
 * Returns most recent first.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md (AP-GCAL-01, AP-GCAL-02)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listNotifications,
  getUnreadCount,
  toNotification,
} from '../../infrastructure/storage/dynamodb/repositories/notificationRepository.js';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    // Parse query parameters
    const limit = parseInt(event.queryStringParameters?.limit || '20', 10);
    const year = event.queryStringParameters?.year
      ? parseInt(event.queryStringParameters.year, 10)
      : new Date().getFullYear();

    // Fetch notifications and unread count in parallel
    const [notificationRecords, unreadCount] = await Promise.all([
      listNotifications(userId, { limit, year }),
      getUnreadCount(userId),
    ]);

    const notifications = notificationRecords.map(toNotification);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          notifications,
          unreadCount,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch notifications');
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
