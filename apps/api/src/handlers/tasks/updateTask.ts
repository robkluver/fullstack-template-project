/**
 * PATCH /users/:userId/tasks/:taskId
 *
 * Updates a task with optimistic locking.
 * Handles status changes (Kanban drag-drop) by updating GSI3.
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md (AP14: Update Task Status)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';

// Valid effort values (Fibonacci)
const VALID_EFFORT = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Request validation schema
const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  effort: z.number().refine((n) => VALID_EFFORT.includes(n), {
    message: 'Effort must be a Fibonacci number',
  }).optional().nullable(),
  startUtc: z.string().datetime().optional().nullable(),
  dueUtc: z.string().datetime().optional().nullable(),
  labels: z.array(z.string()).optional(),
});

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

    // Parse version from header
    const versionHeader = event.headers['if-match'] || event.headers['If-Match'];
    const expectedVersion = versionHeader ? parseInt(versionHeader, 10) : null;
    if (!expectedVersion || isNaN(expectedVersion)) {
      return errorResponse(428, 'PRECONDITION_REQUIRED', 'If-Match header with version is required');
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
    }

    const parseResult = UpdateTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    if (Object.keys(input).length === 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'At least one field must be updated');
    }

    // Fetch existing task
    const getResponse = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `TASK#${taskId}`,
        },
      })
    );

    if (!getResponse.Item) {
      return errorResponse(404, 'NOT_FOUND', 'Task not found');
    }

    const existing = getResponse.Item;

    // Check version for optimistic locking
    if (existing.version !== expectedVersion) {
      return errorResponse(409, 'CONFLICT', 'Task has been modified. Please refresh and try again.');
    }

    const now = new Date().toISOString();

    // Merge updates
    const updated: Record<string, unknown> = {
      ...existing,
      updatedAt: now,
      version: existing.version + 1,
    };

    // Apply field updates
    if (input.title !== undefined) updated.title = input.title;
    if (input.description !== undefined) updated.description = input.description;
    if (input.priority !== undefined) updated.priority = input.priority;
    if (input.effort !== undefined) updated.effort = input.effort;
    if (input.startUtc !== undefined) updated.startUtc = input.startUtc;
    if (input.dueUtc !== undefined) updated.dueUtc = input.dueUtc;

    // Handle labels (Set type)
    if (input.labels !== undefined) {
      updated.labels = input.labels.length > 0 ? new Set(input.labels) : undefined;
    }

    // Handle status change
    if (input.status !== undefined && input.status !== existing.status) {
      updated.status = input.status;
      updated.GSI3PK = `USER#${userId}#STATUS#${input.status}`;

      // Set completedAt for completed status
      if (input.status === 'COMPLETED' && !existing.completedAt) {
        updated.completedAt = now;
      } else if (input.status !== 'COMPLETED' && input.status !== 'ARCHIVED') {
        updated.completedAt = null;
      }
    }

    // Update GSI3SK if priority changed
    if (input.priority !== undefined || input.status !== undefined) {
      const priority = input.priority ?? existing.priority;
      updated.GSI3SK = `P${priority}#${existing.createdAt}`;
    }

    // Recalculate GSI1SK if dates changed
    if (input.startUtc !== undefined || input.dueUtc !== undefined) {
      const startUtc = input.startUtc ?? existing.startUtc;
      const dueUtc = input.dueUtc ?? existing.dueUtc;
      const gsi1sk = calculateGSI1SK(startUtc, dueUtc, existing.createdAt);
      const year = gsi1sk.substring(0, 4);

      updated.GSI1SK = gsi1sk;
      updated.GSI1PK = `USER#${userId}#${year}`;
    }

    // Conditional put with version check
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: updated,
          ConditionExpression: 'version = :expectedVersion',
          ExpressionAttributeValues: {
            ':expectedVersion': expectedVersion,
          },
        })
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return errorResponse(409, 'CONFLICT', 'Task has been modified. Please refresh and try again.');
      }
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        ETag: String(updated.version),
      },
      body: JSON.stringify({
        data: {
          taskId: updated.taskId,
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          version: updated.version,
          updatedAt: updated.updatedAt,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in updateTask:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update task');
  }
};

function calculateGSI1SK(startUtc: string | null | undefined, dueUtc: string | null | undefined, createdAt: string): string {
  const dates = [startUtc, dueUtc].filter(Boolean) as string[];
  if (dates.length === 0) {
    return `Z${createdAt}`;
  }
  return dates.sort()[0] ?? `Z${createdAt}`;
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,If-Match',
    'Access-Control-Expose-Headers': 'ETag',
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
