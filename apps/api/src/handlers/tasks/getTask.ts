/**
 * GET /users/:userId/tasks/:taskId
 *
 * Gets a single task by ID.
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md (AP15: Get Single Task)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
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

    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TASK#${taskId}`,
        },
      })
    );

    if (!response.Item) {
      return errorResponse(404, 'NOT_FOUND', 'Task not found');
    }

    const item = response.Item;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          taskId: item.taskId,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: item.priority,
          effort: item.effort,
          startUtc: item.startUtc,
          dueUtc: item.dueUtc,
          completedAt: item.completedAt,
          labels: item.labels ? Array.from(item.labels as Set<string>) : undefined,
          links: item.links,
          version: item.version,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getTask:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch task');
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
