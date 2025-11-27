/**
 * GET /users/:userId/events/:masterId/series
 *
 * Gets a recurring series (master + all exception instances).
 * Uses GSI2-RecurrenceLookup for adjacency list query.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (AP7: Get Recurring Series)
 * @see docs/backend/dynamodb-spec/02-TABLE-CONFIG-AND-INDEXES.md (GSI2)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI2_NAME } from '../../infrastructure/storage/dynamodb/client.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const masterId = event.pathParameters?.masterId;

    if (!userId || !masterId) {
      return errorResponse(400, 'MISSING_PARAMETERS', 'userId and masterId are required');
    }

    // Query GSI2 for master + all instances
    // GSI2PK = MASTER#<masterId>
    // GSI2SK begins with MASTER or INSTANCE#
    // Master sorts first ("MASTER" < "INSTANCE#...")
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI2_NAME,
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `MASTER#${masterId}`,
        },
        ScanIndexForward: true, // Master first, then instances by date
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return errorResponse(404, 'SERIES_NOT_FOUND', 'Recurring series not found');
    }

    // Verify user owns this series
    const master = result.Items.find(item => item.entityType === 'MASTER');
    if (!master || master.PK !== `USER#${userId}`) {
      return errorResponse(404, 'SERIES_NOT_FOUND', 'Recurring series not found');
    }

    // Separate master from instances
    const instances = result.Items.filter(item => item.entityType === 'INSTANCE');

    // Convert Sets to arrays for JSON serialization
    const serializeMaster = {
      ...master,
      tags: master.tags instanceof Set ? Array.from(master.tags) : master.tags,
      reminderMinutes: master.reminderMinutes instanceof Set ? Array.from(master.reminderMinutes) : master.reminderMinutes,
    };

    const serializeInstances = instances.map(inst => ({
      ...inst,
      tags: inst.tags instanceof Set ? Array.from(inst.tags) : inst.tags,
      reminderMinutes: inst.reminderMinutes instanceof Set ? Array.from(inst.reminderMinutes) : inst.reminderMinutes,
    }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          master: serializeMaster,
          instances: serializeInstances,
          totalInstances: instances.length,
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getSeries:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get recurring series');
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
