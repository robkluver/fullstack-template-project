/**
 * PATCH /users/:userId/reminders/:reminderId
 *
 * Updates a reminder (snooze, complete, dismiss, or edit).
 * Uses optimistic locking with version check.
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md (AP21, AP22)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';

// Request validation schema
const UpdateReminderSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  note: z.string().max(5000).optional().nullable(),
  triggerUtc: z.string().datetime().optional(),
  triggerTzid: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['PENDING', 'SNOOZED', 'COMPLETED', 'DISMISSED']).optional(),
  snoozedUntil: z.string().datetime().optional().nullable(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const reminderId = event.pathParameters?.reminderId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }
    if (!reminderId) {
      return errorResponse(400, 'MISSING_REMINDER_ID', 'reminderId is required');
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

    const parseResult = UpdateReminderSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    if (Object.keys(input).length === 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'At least one field must be updated');
    }

    // Fetch existing reminder
    const getResponse = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `REMINDER#${reminderId}`,
        },
      })
    );

    if (!getResponse.Item) {
      return errorResponse(404, 'NOT_FOUND', 'Reminder not found');
    }

    const existing = getResponse.Item;

    // Check version for optimistic locking
    if (existing.version !== expectedVersion) {
      return errorResponse(409, 'CONFLICT', 'Reminder has been modified. Please refresh and try again.');
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
    if (input.note !== undefined) updated.note = input.note;
    if (input.triggerTzid !== undefined) updated.triggerTzid = input.triggerTzid;
    if (input.color !== undefined) updated.color = input.color;

    // Handle trigger time change - update GSI1 keys
    if (input.triggerUtc !== undefined) {
      updated.triggerUtc = input.triggerUtc;
      const year = input.triggerUtc.substring(0, 4);
      updated.GSI1PK = `USER#${userId}#${year}`;
      updated.GSI1SK = input.triggerUtc;
    }

    // Handle status change
    if (input.status !== undefined) {
      updated.status = input.status;

      // Set TTL for completed/dismissed reminders (24 hours from now)
      if (input.status === 'COMPLETED' || input.status === 'DISMISSED') {
        const ttlDate = new Date();
        ttlDate.setHours(ttlDate.getHours() + 24);
        updated.ttl = Math.floor(ttlDate.getTime() / 1000);
      } else {
        updated.ttl = null;
      }
    }

    // Handle snooze
    if (input.snoozedUntil !== undefined) {
      updated.snoozedUntil = input.snoozedUntil;
      if (input.snoozedUntil) {
        updated.status = 'SNOOZED';
        // Update GSI1SK to snoozedUntil time for proper sorting
        const year = input.snoozedUntil.substring(0, 4);
        updated.GSI1PK = `USER#${userId}#${year}`;
        updated.GSI1SK = input.snoozedUntil;
      }
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
        return errorResponse(409, 'CONFLICT', 'Reminder has been modified. Please refresh and try again.');
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
          reminderId: updated.reminderId,
          title: updated.title,
          status: updated.status,
          triggerUtc: updated.triggerUtc,
          snoozedUntil: updated.snoozedUntil,
          version: updated.version,
          updatedAt: updated.updatedAt,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in updateReminder:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update reminder');
  }
};

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
