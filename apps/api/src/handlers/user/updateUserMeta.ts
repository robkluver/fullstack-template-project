/**
 * PATCH /users/:userId/meta
 *
 * Updates user metadata and preferences with optimistic locking.
 * Requires If-Match header with version number.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (USER_META entity)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';

// Preferences validation schema
const PreferencesSchema = z.object({
  weekStart: z.number().min(0).max(6).optional(),
  defaultEventDuration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  defaultCalendarIncrement: z.union([z.literal(10), z.literal(15), z.literal(30), z.literal(60)]).optional(),
  defaultReminderMinutes: z.array(z.number()).optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  autoArchiveCompletedTasks: z.boolean().optional(),
  autoArchiveDelayHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
  enableBrowserNotifications: z.boolean().optional(),
  enableSoundNotifications: z.boolean().optional(),
}).optional();

// Request validation schema
const UpdateUserMetaSchema = z.object({
  defaultTzid: z.string().optional(),
  preferences: PreferencesSchema,
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
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

    const parseResult = UpdateUserMetaSchema.safeParse(body);
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

    // Handle top-level defaultTzid
    if (updates.defaultTzid !== undefined) {
      updateExpressions.push('#defaultTzid = :defaultTzid');
      expressionAttributeNames['#defaultTzid'] = 'defaultTzid';
      expressionAttributeValues[':defaultTzid'] = updates.defaultTzid;
    }

    // Handle nested preferences (merge with existing)
    if (updates.preferences) {
      for (const [key, value] of Object.entries(updates.preferences)) {
        if (value !== undefined) {
          updateExpressions.push(`#preferences.#${key} = :pref_${key}`);
          expressionAttributeNames['#preferences'] = 'preferences';
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:pref_${key}`] = value;
        }
      }
    }

    // Always increment version and update timestamp
    updateExpressions.push('#version = #version + :inc');
    updateExpressions.push('#updatedAt = :now');
    expressionAttributeNames['#version'] = 'version';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':inc'] = 1;
    expressionAttributeValues[':now'] = now;
    expressionAttributeValues[':expectedVersion'] = expectedVersion;

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `USER_META#${userId}`,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ConditionExpression: '#version = :expectedVersion AND attribute_exists(PK)',
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          data: result.Attributes,
          error: null,
        }),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        return errorResponse(
          409,
          'VERSION_CONFLICT',
          'User metadata was modified by another client or does not exist. Please refresh and retry.'
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in updateUserMeta:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update user metadata');
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
