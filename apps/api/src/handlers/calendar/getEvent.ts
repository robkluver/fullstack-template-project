/**
 * GET /users/:userId/events/:eventId
 *
 * Retrieves a single event by ID (EVENT, MASTER, or INSTANCE).
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (AP2: Single Event)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const eventId = event.pathParameters?.eventId;

    if (!userId || !eventId) {
      return errorResponse(400, 'MISSING_PARAMETERS', 'userId and eventId are required');
    }

    // Determine SK prefix based on entity type
    let skPrefix = 'EVENT#';
    if (eventId.startsWith('mst_')) {
      skPrefix = 'MASTER#';
    } else if (eventId.startsWith('inst_')) {
      // Instance SK includes masterId and date
      skPrefix = 'INSTANCE#';
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `${skPrefix}${eventId}`,
        },
      })
    );

    if (!result.Item) {
      return errorResponse(404, 'EVENT_NOT_FOUND', `Event ${eventId} not found`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: result.Item,
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getEvent:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve event');
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
