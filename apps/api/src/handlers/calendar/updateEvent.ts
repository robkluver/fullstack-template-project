/**
 * PATCH /users/:userId/events/:eventId
 *
 * Updates an event with optimistic locking.
 * Requires If-Match header with version number.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (AP4: Update Event)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';

// Request validation schema (all fields optional for PATCH)
const UpdateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  startUtc: z.string().datetime().optional(),
  endUtc: z.string().datetime().optional(),
  startTzid: z.string().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['CONFIRMED', 'TENTATIVE', 'CANCELLED']).optional(),
  tags: z.array(z.string()).optional(),
  reminderMinutes: z.array(z.number()).optional(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const eventId = event.pathParameters?.eventId;

    if (!userId || !eventId) {
      return errorResponse(400, 'MISSING_PARAMETERS', 'userId and eventId are required');
    }

    // Extract version from If-Match header (optimistic locking)
    const ifMatch = event.headers['If-Match'] || event.headers['if-match'];
    if (!ifMatch) {
      return errorResponse(428, 'PRECONDITION_REQUIRED', 'If-Match header with version is required');
    }

    const expectedVersion = parseInt(ifMatch.replace(/"/g, ''), 10);
    if (isNaN(expectedVersion)) {
      return errorResponse(400, 'INVALID_VERSION', 'If-Match header must contain a valid version number');
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
    }

    const parseResult = UpdateEventSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const updates = parseResult.data;
    if (Object.keys(updates).length === 0) {
      return errorResponse(400, 'NO_UPDATES', 'At least one field must be provided for update');
    }

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'tags' && Array.isArray(value)) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          const tagValues = value as string[];
          expressionAttributeValues[`:${key}`] = tagValues.length > 0 ? new Set(tagValues) : null;
        } else if (key === 'reminderMinutes' && Array.isArray(value)) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          const reminderValues = value as number[];
          expressionAttributeValues[`:${key}`] = reminderValues.length > 0 ? new Set(reminderValues) : null;
        } else {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      }
    }

    // Always increment version and update timestamp
    updateExpressions.push('#version = #version + :inc');
    updateExpressions.push('#updatedAt = :now');
    updateExpressions.push('#sequence = #sequence + :inc');
    expressionAttributeNames['#version'] = 'version';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeNames['#sequence'] = 'sequence';
    expressionAttributeValues[':inc'] = 1;
    expressionAttributeValues[':now'] = now;
    expressionAttributeValues[':expectedVersion'] = expectedVersion;

    // Update GSI1 keys if startUtc changed
    if (updates.startUtc) {
      const newYear = updates.startUtc.substring(0, 4);
      updateExpressions.push('#GSI1PK = :gsi1pk');
      updateExpressions.push('#GSI1SK = :gsi1sk');
      expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
      expressionAttributeNames['#GSI1SK'] = 'GSI1SK';
      expressionAttributeValues[':gsi1pk'] = `USER#${userId}#${newYear}`;
      expressionAttributeValues[':gsi1sk'] = updates.startUtc;
    }

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `EVENT#${eventId}`,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ConditionExpression: '#version = :expectedVersion',
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          data: {
            eventId,
            version: result.Attributes?.version,
            updatedAt: now,
          },
          error: null,
        }),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        return errorResponse(
          409,
          'VERSION_CONFLICT',
          'Event was modified by another client. Please refresh and retry.'
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in updateEvent:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update event');
  }
};

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,If-Match',
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
