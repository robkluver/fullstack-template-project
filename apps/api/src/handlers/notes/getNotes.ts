/**
 * GET /users/:userId/notes
 *
 * Retrieves all notes for a user.
 * AP23: Get All Notes
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md (NOTE schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME } from '../../infrastructure/storage/dynamodb/client.js';

interface Note {
  noteId: string;
  title: string;
  body?: string;
  slug?: string;
  color?: string;
  isPinned: boolean;
  tags?: string[];
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    // Query parameters
    const queryParams = event.queryStringParameters || {};
    const includeArchived = queryParams.includeArchived === 'true';
    const year = queryParams.year || new Date().getFullYear().toString();
    const tag = queryParams.tag;

    // Build query
    const expressionAttrValues: Record<string, unknown> = {
      ':pk': `USER#${userId}#${year}`,
      ':entityType': 'NOTE',
    };
    const expressionAttrNames: Record<string, string> = {
      '#status': 'status',
    };

    let filterExpression = 'entityType = :entityType';

    // Filter by status unless includeArchived
    if (!includeArchived) {
      filterExpression += ' AND #status = :activeStatus';
      expressionAttrValues[':activeStatus'] = 'ACTIVE';
    }

    // Filter by tag if provided
    if (tag) {
      filterExpression += ' AND contains(tags, :tag)';
      expressionAttrValues[':tag'] = tag;
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: 'GSI1PK = :pk',
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttrValues,
        ExpressionAttributeNames: expressionAttrNames,
        ScanIndexForward: false, // Newest first
      })
    );

    // Transform items to API response format
    const notes: Note[] = (result.Items || []).map(transformNote);

    // Sort: pinned first, then by updatedAt descending
    notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          notes,
          meta: {
            year,
            total: notes.length,
            includeArchived,
          },
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getNotes:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch notes');
  }
};

function transformNote(item: Record<string, unknown>): Note {
  const note: Note = {
    noteId: item.noteId as string,
    title: item.title as string,
    status: item.status as string,
    isPinned: (item.isPinned as boolean) || false,
    version: item.version as number,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };

  // Optional fields
  if (item.body) note.body = item.body as string;
  if (item.slug) note.slug = item.slug as string;
  if (item.color) note.color = item.color as string;
  if (item.tags) note.tags = Array.from(item.tags as Set<string>);

  return note;
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
