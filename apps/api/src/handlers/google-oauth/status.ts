/**
 * GET /users/:userId/google-calendar/status
 *
 * Returns the Google Calendar connection status for a user.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md (AP-GCAL-06)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import type { GoogleOAuthStatus } from '@nexus/shared';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
        ProjectionExpression: 'googleOAuth, googleCalendarSync',
      })
    );

    const googleOAuth = result.Item?.googleOAuth;
    const googleCalendarSync = result.Item?.googleCalendarSync;

    const status: GoogleOAuthStatus = googleOAuth
      ? {
          connected: true,
          email: googleOAuth.email,
          connectedAt: googleOAuth.connectedAt,
          lastSyncAt: googleCalendarSync?.lastSyncAt,
        }
      : {
          connected: false,
        };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: status,
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in google status:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get Google Calendar status');
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
