/**
 * PATCH /users/:userId/notifications/:notificationId
 *
 * Updates notification status (mark as read or dismissed).
 * Uses optimistic locking with version check.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md (AP-GCAL-04)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  updateNotificationStatus,
  getNotificationById,
  toNotification,
} from '../../infrastructure/storage/dynamodb/repositories/notificationRepository.js';
import type { NotificationStatus } from '@nexus/shared';

const VALID_STATUSES: NotificationStatus[] = ['UNREAD', 'READ', 'DISMISSED'];

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

    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    let body: { status?: string; version?: number };
    try {
      body = JSON.parse(event.body);
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Invalid JSON in request body');
    }

    // Validate status
    if (!body.status) {
      return errorResponse(400, 'MISSING_STATUS', 'status is required');
    }
    if (!VALID_STATUSES.includes(body.status as NotificationStatus)) {
      return errorResponse(
        400,
        'INVALID_STATUS',
        `status must be one of: ${VALID_STATUSES.join(', ')}`
      );
    }

    // Validate version
    if (typeof body.version !== 'number') {
      return errorResponse(400, 'MISSING_VERSION', 'version is required for optimistic locking');
    }

    // Check if notification exists
    const existing = await getNotificationById(userId, notificationId);
    if (!existing) {
      return errorResponse(404, 'NOT_FOUND', 'Notification not found');
    }

    // Update notification status
    const updated = await updateNotificationStatus(
      userId,
      notificationId,
      body.status as NotificationStatus,
      body.version
    );

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: toNotification(updated),
        error: null,
      }),
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return errorResponse(
        409,
        'VERSION_CONFLICT',
        'Notification was modified by another request. Please refresh and try again.'
      );
    }

    console.error('Error in updateNotification:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update notification');
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
