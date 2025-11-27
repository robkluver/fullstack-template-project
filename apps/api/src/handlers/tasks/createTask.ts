/**
 * POST /users/:userId/tasks
 *
 * Creates a new task (TASK entity).
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md (TASK schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Valid effort values (Fibonacci)
const VALID_EFFORT = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Request validation schema
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).default('BACKLOG'),
  priority: z.number().int().min(1).max(5).default(3),
  effort: z.number().refine((n) => VALID_EFFORT.includes(n), {
    message: 'Effort must be a Fibonacci number: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89',
  }).optional(),
  startUtc: z.string().datetime().optional(),
  dueUtc: z.string().datetime().optional(),
  labels: z.array(z.string()).optional(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
    }

    const parseResult = CreateTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    const taskId = `task_${randomUUID()}`;
    const now = new Date().toISOString();

    // Calculate GSI1SK (earliest date for agenda view)
    const gsi1sk = calculateGSI1SK(input.startUtc, input.dueUtc, now);
    const year = gsi1sk.substring(0, 4);

    // Calculate GSI3SK (priority + creation for Kanban sort)
    const gsi3sk = `P${input.priority}#${now}`;

    // Build item per DYNAMODB_CONVENTIONS.md
    const item: Record<string, unknown> = {
      // Base table keys
      PK: `USER#${userId}`,
      SK: `TASK#${taskId}`,

      // GSI1 keys (for agenda view)
      GSI1PK: `USER#${userId}#${year}`,
      GSI1SK: gsi1sk,

      // GSI3 keys (for Kanban view)
      GSI3PK: `USER#${userId}#STATUS#${input.status}`,
      GSI3SK: gsi3sk,

      // Core attributes
      entityType: 'TASK',
      taskId,
      title: input.title,
      description: input.description || null,

      // Status and workflow
      status: input.status,
      priority: input.priority,
      effort: input.effort || null,

      // Temporal attributes
      startUtc: input.startUtc || null,
      dueUtc: input.dueUtc || null,
      completedAt: input.status === 'COMPLETED' ? now : null,

      // Cross-linking (empty by default)
      links: [],

      // Version control
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Handle Sets (DynamoDB native types)
    if (input.labels && input.labels.length > 0) {
      item.labels = new Set(input.labels);
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwrites
      })
    );

    return {
      statusCode: 201,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          taskId,
          title: input.title,
          status: input.status,
          priority: input.priority,
          version: 1,
          createdAt: now,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in createTask:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create task');
  }
};

// Calculate GSI1SK - earliest date for agenda sorting
function calculateGSI1SK(startUtc: string | undefined, dueUtc: string | undefined, createdAt: string): string {
  const dates = [startUtc, dueUtc].filter(Boolean) as string[];
  if (dates.length === 0) {
    // No dates set - use createdAt with Z prefix to sort after dated items
    return `Z${createdAt}`;
  }
  return dates.sort()[0] ?? `Z${createdAt}`;
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
