/**
 * DELETE /users/:userId/tasks/:taskId
 *
 * Deletes a task.
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const taskId = event.pathParameters?.taskId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }
    if (!taskId) {
      return errorResponse(400, 'MISSING_TASK_ID', 'taskId is required');
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TASK#${taskId}`,
        },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );

    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  } catch (error) {
    // Check if item didn't exist
    if ((error as Error).name === 'ConditionalCheckFailedException') {
      return errorResponse(404, 'NOT_FOUND', 'Task not found');
    }

    console.error('Error in deleteTask:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete task');
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
