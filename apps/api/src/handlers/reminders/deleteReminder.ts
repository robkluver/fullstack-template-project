/**
 * DELETE /users/:userId/reminders/:reminderId
 *
 * Deletes a reminder.
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REMINDER#${reminderId}`,
        },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: { deleted: true },
        error: null,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return errorResponse(404, 'NOT_FOUND', 'Reminder not found');
    }
    console.error('Error in deleteReminder:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete reminder');
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
