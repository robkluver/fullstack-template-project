/**
 * DELETE /users/:userId/notes/:noteId
 *
 * Deletes a note (or archives it based on soft delete preference).
 * AP28: Archive/Delete Note
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md (NOTE schema)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
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

    // Check for soft delete preference
    const queryParams = event.queryStringParameters || {};
    const hardDelete = queryParams.hard === 'true';

    const keys = {
      PK: `USER#${userId}`,
      SK: `NOTE#${noteId}`,
    };

    if (hardDelete) {
      // Hard delete - remove the item completely
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: keys,
          ConditionExpression: 'attribute_exists(PK)',
        })
      );
    } else {
      // Soft delete - archive the note with TTL
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: keys,
          UpdateExpression: 'SET #status = :status, #ttl = :ttl, updatedAt = :now, #version = #version + :one',
          ConditionExpression: 'attribute_exists(PK)',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#ttl': 'ttl',
            '#version': 'version',
          },
          ExpressionAttributeValues: {
            ':status': 'ARCHIVED',
            ':ttl': ttl,
            ':now': now,
            ':one': 1,
          },
        })
      );
    }

    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return errorResponse(404, 'NOT_FOUND', 'Note not found');
    }

    console.error('Error in deleteNote:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete note');
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
