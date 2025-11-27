/**
 * DELETE /users/:userId/events/:masterId/future
 *
 * Ends a recurring series from a specific date forward.
 * Sets rruleUntil on the master to stop generating future occurrences.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (AP10: End Recurring Series)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI2_NAME } from '../../infrastructure/storage/dynamodb/client.js';
import { z } from 'zod';

// Request validation schema
const EndSeriesSchema = z.object({
  endDate: z.string().datetime().optional(), // If not provided, ends from now
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    const masterId = event.pathParameters?.masterId;

    if (!userId || !masterId) {
      return errorResponse(400, 'MISSING_PARAMETERS', 'userId and masterId are required');
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

    // Parse request body for end date
    let endDate: string;
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        const parseResult = EndSeriesSchema.safeParse(body);
        if (!parseResult.success) {
          return errorResponse(400, 'VALIDATION_ERROR', parseResult.error.message);
        }
        endDate = parseResult.data.endDate || new Date().toISOString();
      } catch {
        return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
      }
    } else {
      endDate = new Date().toISOString();
    }

    const now = new Date().toISOString();

    try {
      // Update master to set rruleUntil (end the series)
      const updateResult = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `MASTER#${masterId}`,
          },
          UpdateExpression: 'SET #rruleUntil = :endDate, #updatedAt = :now, #version = #version + :inc, #sequence = #sequence + :inc',
          ConditionExpression: '#version = :expectedVersion AND attribute_exists(PK)',
          ExpressionAttributeNames: {
            '#rruleUntil': 'rruleUntil',
            '#updatedAt': 'updatedAt',
            '#version': 'version',
            '#sequence': 'sequence',
          },
          ExpressionAttributeValues: {
            ':endDate': endDate,
            ':now': now,
            ':inc': 1,
            ':expectedVersion': expectedVersion,
          },
          ReturnValues: 'ALL_NEW',
        })
      );

      // Optionally: Delete future instances that are after the end date
      // Query GSI2 for instances after the end date
      const instancesResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI2_NAME,
          KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :instancePrefix)',
          FilterExpression: '#startUtc >= :endDate',
          ExpressionAttributeNames: {
            '#startUtc': 'startUtc',
          },
          ExpressionAttributeValues: {
            ':pk': `MASTER#${masterId}`,
            ':instancePrefix': 'INSTANCE#',
            ':endDate': endDate,
          },
        })
      );

      // Delete future instances in batches
      if (instancesResult.Items && instancesResult.Items.length > 0) {
        const deleteRequests = instancesResult.Items.map(item => ({
          DeleteRequest: {
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          },
        }));

        // BatchWrite in chunks of 25 (DynamoDB limit)
        for (let i = 0; i < deleteRequests.length; i += 25) {
          const batch = deleteRequests.slice(i, i + 25);
          await docClient.send(
            new BatchWriteCommand({
              RequestItems: {
                [TABLE_NAME]: batch,
              },
            })
          );
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          data: {
            masterId,
            rruleUntil: endDate,
            deletedInstances: instancesResult.Items?.length || 0,
            version: updateResult.Attributes?.version,
            updatedAt: now,
          },
          error: null,
        }),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        return errorResponse(
          409,
          'VERSION_CONFLICT',
          'Series was modified by another client or does not exist. Please refresh and retry.'
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in endSeries:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to end recurring series');
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
