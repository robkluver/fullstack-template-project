/**
 * POST /users/:userId/notes
 *
 * Creates a new note (NOTE entity).
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md (NOTE schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Request validation schema
const CreateNoteSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(50000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
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

    const parseResult = CreateNoteSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
    }

    const input = parseResult.data;
    const noteId = `note_${randomUUID()}`;
    const now = new Date().toISOString();
    const year = now.substring(0, 4);

    // Build item
    const item: Record<string, unknown> = {
      // Base table keys
      PK: `USER#${userId}`,
      SK: `NOTE#${noteId}`,

      // GSI1 keys (for timeline view)
      GSI1PK: `USER#${userId}#${year}`,
      GSI1SK: now,

      // Core attributes
      entityType: 'NOTE',
      noteId,
      title: input.title,
      body: input.body || null,
      slug: generateSlug(input.title),

      // Display
      color: input.color || '#3b82f6', // Default blue
      isPinned: input.isPinned || false,

      // Status
      status: 'ACTIVE',

      // Cross-linking (empty by default)
      links: [],

      // Version control
      version: 1,
      createdAt: now,
      updatedAt: now,

      // TTL (not set initially)
      ttl: null,
    };

    // Handle tags (Set type)
    if (input.tags && input.tags.length > 0) {
      item.tags = new Set(input.tags);
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
          noteId,
          title: input.title,
          slug: item.slug,
          status: 'ACTIVE',
          isPinned: item.isPinned,
          version: 1,
          createdAt: now,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in createNote:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create note');
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
