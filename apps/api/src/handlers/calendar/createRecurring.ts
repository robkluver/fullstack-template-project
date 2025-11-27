/**
 * POST /users/:userId/recurring
 *
 * Creates a recurring event master (MASTER entity).
 * Instances are generated virtually on query; only exceptions are stored.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (MASTER schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Request validation schema
const CreateRecurringSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  rrule: z.string().min(1), // RFC 5545 recurrence rule (e.g., "FREQ=WEEKLY;BYDAY=MO")
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  startTzid: z.string().optional().nullable(),
  isAllDay: z.boolean().default(false),
  location: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#34A853'),
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

    const parseResult = CreateRecurringSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    const masterId = `mst_${randomUUID()}`;
    const now = new Date().toISOString();
    const year = input.startUtc.substring(0, 4);

    // Build MASTER item per DATABASE_SCHEMA.md Section 4.2
    const item: Record<string, unknown> = {
      // Base table keys
      PK: `USER#${userId}`,
      SK: `MASTER#${masterId}`,

      // GSI1 keys (year-based partitioning - first occurrence)
      GSI1PK: `USER#${userId}#${year}`,
      GSI1SK: input.startUtc,

      // GSI2 keys (sparse index for series lookup)
      GSI2PK: `MASTER#${masterId}`,
      GSI2SK: 'MASTER', // Sorts before INSTANCE# entries

      // Core attributes
      entityType: 'MASTER',
      eventId: masterId,
      masterId: masterId, // Self-reference
      title: input.title,
      description: input.description || null,

      // Recurrence rule (RFC 5545)
      rrule: input.rrule,
      rruleUntil: null, // Set when series is ended
      exdate: [], // Exception dates (YYYYMMDD)
      rdate: [], // Additional dates (rare)
      hasExceptions: false,

      // Temporal attributes (first occurrence)
      isAllDay: input.isAllDay,
      startUtc: input.startUtc,
      endUtc: input.endUtc,
      startTzid: input.startTzid || null,

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
      icalUid: `${masterId}@nexus.app`,
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
          masterId,
          title: input.title,
          rrule: input.rrule,
          startUtc: input.startUtc,
          version: 1,
          createdAt: now,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in createRecurring:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create recurring event');
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
