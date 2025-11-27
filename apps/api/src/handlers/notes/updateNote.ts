/**
 * PATCH /users/:userId/notes/:noteId
 *
 * Updates an existing note with optimistic locking.
 * AP26: Update Note
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md (NOTE schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';

// Request validation schema
const UpdateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().max(50000).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string()).nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

// Generate URL-friendly slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const noteId = event.pathParameters?.noteId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }
    if (!noteId) {
      return errorResponse(400, 'MISSING_NOTE_ID', 'noteId is required');
    }

    // Get version from If-Match header
    const ifMatchHeader = event.headers['If-Match'] || event.headers['if-match'];
    if (!ifMatchHeader) {
      return errorResponse(428, 'PRECONDITION_REQUIRED', 'If-Match header required');
    }

    const expectedVersion = parseInt(ifMatchHeader, 10);
    if (isNaN(expectedVersion)) {
      return errorResponse(400, 'INVALID_VERSION', 'If-Match must be a number');
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
    }

    const parseResult = UpdateNoteSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    if (Object.keys(input).length === 0) {
      return errorResponse(400, 'NO_UPDATES', 'At least one field must be provided');
    }

    const now = new Date().toISOString();

    // Build update expression
    const updateParts: string[] = [];
    const expressionAttrNames: Record<string, string> = {};
    const expressionAttrValues: Record<string, unknown> = {
      ':expectedVersion': expectedVersion,
      ':now': now,
      ':newVersion': expectedVersion + 1,
    };
    const removeAttrs: string[] = [];

    // Always update version and updatedAt
    updateParts.push('#version = :newVersion');
    updateParts.push('updatedAt = :now');
    expressionAttrNames['#version'] = 'version';

    // Handle each updateable field
    if (input.title !== undefined) {
      updateParts.push('title = :title');
      expressionAttrValues[':title'] = input.title;
      // Update slug when title changes
      updateParts.push('slug = :slug');
      expressionAttrValues[':slug'] = generateSlug(input.title);
    }

    if (input.body !== undefined) {
      if (input.body === null) {
        removeAttrs.push('body');
      } else {
        updateParts.push('body = :body');
        expressionAttrValues[':body'] = input.body;
      }
    }

    if (input.color !== undefined) {
      if (input.color === null) {
        removeAttrs.push('color');
      } else {
        updateParts.push('color = :color');
        expressionAttrValues[':color'] = input.color;
      }
    }

    if (input.isPinned !== undefined) {
      updateParts.push('isPinned = :isPinned');
      expressionAttrValues[':isPinned'] = input.isPinned;
    }

    if (input.tags !== undefined) {
      if (input.tags === null || input.tags.length === 0) {
        removeAttrs.push('tags');
      } else {
        updateParts.push('tags = :tags');
        expressionAttrValues[':tags'] = new Set(input.tags);
      }
    }

    if (input.status !== undefined) {
      updateParts.push('#status = :status');
      expressionAttrNames['#status'] = 'status';
      expressionAttrValues[':status'] = input.status;

      // If archiving, set TTL for auto-cleanup (30 days)
      if (input.status === 'ARCHIVED') {
        updateParts.push('#ttl = :ttl');
        expressionAttrNames['#ttl'] = 'ttl';
        expressionAttrValues[':ttl'] = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      } else if (input.status === 'ACTIVE') {
        // Remove TTL if restoring
        removeAttrs.push('#ttl');
        expressionAttrNames['#ttl'] = 'ttl';
      }
    }

    // Build full update expression
    let updateExpression = 'SET ' + updateParts.join(', ');
    if (removeAttrs.length > 0) {
      updateExpression += ' REMOVE ' + removeAttrs.join(', ');
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `NOTE#${noteId}`,
        },
        UpdateExpression: updateExpression,
        ConditionExpression: 'attribute_exists(PK) AND #version = :expectedVersion',
        ExpressionAttributeNames: expressionAttrNames,
        ExpressionAttributeValues: expressionAttrValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    const updated = result.Attributes;
    if (!updated) {
      return errorResponse(500, 'UPDATE_FAILED', 'Failed to retrieve updated note');
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'ETag': String(updated.version),
      },
      body: JSON.stringify({
        data: {
          noteId: updated.noteId,
          title: updated.title,
          slug: updated.slug,
          status: updated.status,
          isPinned: updated.isPinned,
          version: updated.version,
          updatedAt: updated.updatedAt,
        },
        error: null,
      }),
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return errorResponse(409, 'VERSION_CONFLICT', 'Note was modified by another request');
    }

    console.error('Error in updateNote:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update note');
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
