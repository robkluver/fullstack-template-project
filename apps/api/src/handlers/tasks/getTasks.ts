/**
 * GET /users/:userId/tasks
 *
 * Gets Kanban board - all tasks grouped by status.
 * Queries GSI3 for each status in parallel.
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md (AP11: Get Kanban Board)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI3_NAME } from '../../infrastructure/storage/dynamodb/client.js';

const STATUSES = ['BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'] as const;

interface Task {
  taskId: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  effort?: number;
  startUtc?: string;
  dueUtc?: string;
  completedAt?: string;
  labels?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    // Optional status filter
    const statusFilter = event.queryStringParameters?.status;
    const statuses = statusFilter
      ? [statusFilter]
      : STATUSES;

    // Query all statuses in parallel
    const results = await Promise.all(
      statuses.map(async (status) => {
        const response = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI3_NAME,
            KeyConditionExpression: 'GSI3PK = :pk',
            ExpressionAttributeValues: {
              ':pk': `USER#${userId}#STATUS#${status}`,
            },
            // Results auto-sorted by P1 first (highest priority), then by creation date
          })
        );

        const tasks = (response.Items || []).map((item) => transformTask(item));
        return { status, tasks };
      })
    );

    // Group results by status
    const board: Record<string, Task[]> = {};
    for (const { status, tasks } of results) {
      board[status] = tasks;
    }

    // Count totals
    const counts = {
      total: Object.values(board).flat().length,
      byStatus: Object.fromEntries(
        Object.entries(board).map(([status, tasks]) => [status, tasks.length])
      ),
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          board,
          counts,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getTasks:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch tasks');
  }
};

function transformTask(item: Record<string, unknown>): Task {
  const task: Task = {
    taskId: item.taskId as string,
    title: item.title as string,
    status: item.status as string,
    priority: item.priority as number,
    version: item.version as number,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };

  // Only set optional properties if they have values
  if (item.description) task.description = item.description as string;
  if (item.effort) task.effort = item.effort as number;
  if (item.startUtc) task.startUtc = item.startUtc as string;
  if (item.dueUtc) task.dueUtc = item.dueUtc as string;
  if (item.completedAt) task.completedAt = item.completedAt as string;
  if (item.labels) task.labels = Array.from(item.labels as Set<string>);

  return task;
}

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
