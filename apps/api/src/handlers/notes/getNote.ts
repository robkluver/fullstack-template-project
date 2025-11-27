/**
 * GET /users/:userId/notes/:noteId
 *
 * Retrieves a single note by ID.
 * AP24: Get Single Note
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md (NOTE schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';

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

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `NOTE#${noteId}`,
        },
      })
    );

    if (!result.Item) {
      return errorResponse(404, 'NOT_FOUND', 'Note not found');
    }

    const item = result.Item;

    // Build response object
    const note: Record<string, unknown> = {
      noteId: item.noteId,
      title: item.title,
      status: item.status,
      isPinned: item.isPinned || false,
      version: item.version,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    // Optional fields
    if (item.body) note.body = item.body;
    if (item.slug) note.slug = item.slug;
    if (item.color) note.color = item.color;
    if (item.tags) note.tags = Array.from(item.tags as Set<string>);
    if (item.links) note.links = item.links;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: note,
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getNote:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch note');
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
