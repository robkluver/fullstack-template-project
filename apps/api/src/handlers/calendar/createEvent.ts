/**
 * POST /users/:userId/events
 *
 * Creates a new calendar event (EVENT entity).
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (EVENT schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Request validation schema
const CreateEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  startTzid: z.string().optional().nullable(),
  endTzid: z.string().optional().nullable(),
  isAllDay: z.boolean().default(false),
  location: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#4285F4'),
  tags: z.array(z.string()).optional(),
  reminderMinutes: z.array(z.number()).optional(),
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

    const parseResult = CreateEventSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    const eventId = `evt_${randomUUID()}`;
    const now = new Date().toISOString();
    const year = input.startUtc.substring(0, 4);

    // Build item per DYNAMODB_CONVENTIONS.md
    const item: Record<string, unknown> = {
      // Base table keys
      PK: `USER#${userId}`,
      SK: `EVENT#${eventId}`,

      // GSI1 keys (year-based partitioning)
      GSI1PK: `USER#${userId}#${year}`,
      GSI1SK: input.startUtc,

      // Core attributes
      entityType: 'EVENT',
      eventId,
      title: input.title,
      description: input.description || null,

      // Temporal attributes
      isAllDay: input.isAllDay,
      startUtc: input.startUtc,
      endUtc: input.endUtc,
      startTzid: input.startTzid || null,
      endTzid: input.endTzid || null,

      // Metadata
      location: input.location || null,
      color: input.color,
      status: 'CONFIRMED',

      // Cross-linking (empty by default, populated via Phase 5)
      links: [],

      // Version control (optimistic locking)
      version: 1,
      createdAt: now,
      updatedAt: now,

      // iCalendar compatibility
      icalUid: `${eventId}@nexus.app`,
      sequence: 0,
    };

    // Handle Sets (DynamoDB native types)
    if (input.tags && input.tags.length > 0) {
      item.tags = new Set(input.tags);
    }
    if (input.reminderMinutes && input.reminderMinutes.length > 0) {
      item.reminderMinutes = new Set(input.reminderMinutes);
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
          eventId,
          title: input.title,
          startUtc: input.startUtc,
          version: 1,
          createdAt: now,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in createEvent:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create event');
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
