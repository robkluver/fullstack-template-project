/**
 * GET /users/:userId/meta
 *
 * Retrieves user metadata and preferences.
 * Creates default USER_META if it doesn't exist (first login scenario).
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (USER_META entity)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  weekStart: 1, // Monday
  defaultEventDuration: 30,
  defaultCalendarIncrement: 15,
  defaultReminderMinutes: [15],
  theme: 'auto',
  autoArchiveCompletedTasks: true,
  autoArchiveDelayHours: 24,
  enableBrowserNotifications: true,
  enableSoundNotifications: true,
};

// Default stats for new users
const DEFAULT_STATS = {
  totalEvents: 0,
  totalTasks: 0,
  totalReminders: 0,
  totalNotes: 0,
  upcomingEvents: 0,
  overdueTasks: 0,
  lastEventCreated: null,
  lastTaskCompleted: null,
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
      })
    );

    // If user meta doesn't exist, create default
    if (!result.Item) {
      const now = new Date().toISOString();
      const newUserMeta = {
        PK: `USER#${userId}`,
        SK: `USER_META#${userId}`,
        entityType: 'USER_META',
        userId,
        defaultTzid: 'UTC',
        preferences: DEFAULT_PREFERENCES,
        stats: DEFAULT_STATS,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: newUserMeta,
          ConditionExpression: 'attribute_not_exists(PK)', // Prevent race condition
        })
      );

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          data: newUserMeta,
          error: null,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: result.Item,
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getUserMeta:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve user metadata');
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
