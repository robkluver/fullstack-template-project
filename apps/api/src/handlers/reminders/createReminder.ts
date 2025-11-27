/**
 * POST /users/:userId/reminders
 *
 * Creates a new reminder (REMINDER entity).
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md (REMINDER schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Request validation schema
const CreateReminderSchema = z.object({
  title: z.string().min(1).max(500),
  note: z.string().max(5000).optional(),
  triggerUtc: z.string().datetime(),
  triggerTzid: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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

    const parseResult = CreateReminderSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    const reminderId = `rem_${randomUUID()}`;
    const now = new Date().toISOString();
    const year = input.triggerUtc.substring(0, 4);

    // Build item per DYNAMODB_CONVENTIONS.md
    const item: Record<string, unknown> = {
      // Base table keys
      PK: `USER#${userId}`,
      SK: `REMINDER#${reminderId}`,

      // GSI1 keys (for agenda view)
      GSI1PK: `USER#${userId}#${year}`,
      GSI1SK: input.triggerUtc,

      // Core attributes
      entityType: 'REMINDER',
      reminderId,
      title: input.title,
      note: input.note || null,

      // Temporal attributes
      triggerUtc: input.triggerUtc,
      triggerTzid: input.triggerTzid ?? null,

      // Display
      color: input.color || '#f59e0b', // Default amber

      // Status
      status: 'PENDING',
      snoozedUntil: null,

      // Cross-linking (empty by default)
      links: [],

      // Version control
      version: 1,
      createdAt: now,
      updatedAt: now,

      // TTL (not set initially)
      ttl: null,
    };

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
          reminderId,
          title: input.title,
          triggerUtc: input.triggerUtc,
          status: 'PENDING',
          version: 1,
          createdAt: now,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in createReminder:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create reminder');
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
