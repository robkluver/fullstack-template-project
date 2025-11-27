/**
 * GET /users/:userId/reminders/:reminderId
 *
 * Retrieves a single reminder by ID.
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const reminderId = event.pathParameters?.reminderId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }
    if (!reminderId) {
      return errorResponse(400, 'MISSING_REMINDER_ID', 'reminderId is required');
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REMINDER#${reminderId}`,
        },
      })
    );

    if (!result.Item) {
      return errorResponse(404, 'NOT_FOUND', 'Reminder not found');
    }

    const item = result.Item;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        ETag: String(item.version),
      },
      body: JSON.stringify({
        data: {
          reminderId: item.reminderId,
          title: item.title,
          note: item.note,
          triggerUtc: item.triggerUtc,
          triggerTzid: item.triggerTzid,
          color: item.color,
          status: item.status,
          snoozedUntil: item.snoozedUntil,
          links: item.links,
          version: item.version,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getReminder:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve reminder');
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
