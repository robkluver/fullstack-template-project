/**
 * GET /users/:userId/reminders
 *
 * Gets pending reminders for a date range.
 * Uses GSI1 + FilterExpression for status filtering.
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md (AP19: Get Pending Reminders)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME } from '../../infrastructure/storage/dynamodb/client.js';

type ReminderStatus = 'PENDING' | 'SNOOZED' | 'COMPLETED' | 'DISMISSED';

interface Reminder {
  reminderId: string;
  title: string;
  note?: string;
  triggerUtc: string;
  triggerTzid?: string | null;
  color?: string;
  status: ReminderStatus;
  snoozedUntil?: string | null;
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

    // Parse query parameters
    const fromDate = event.queryStringParameters?.from
      ? new Date(event.queryStringParameters.from)
      : new Date();
    const days = parseInt(event.queryStringParameters?.days || '7', 10);
    const statusFilter = event.queryStringParameters?.status;

    if (isNaN(fromDate.getTime())) {
      return errorResponse(400, 'INVALID_DATE', 'from parameter must be valid ISO 8601 date');
    }

    // Calculate date range
    const startUtc = fromDate.toISOString();
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() + days);
    const endUtc = endDate.toISOString();

    const startYear = fromDate.getFullYear();
    const endYear = endDate.getFullYear();

    let items: Record<string, unknown>[] = [];

    // Build filter expression
    const filterStatuses = statusFilter
      ? [statusFilter]
      : ['PENDING', 'SNOOZED'];
    const filterExpression = '#status IN (' +
      filterStatuses.map((_, i) => `:status${i}`).join(', ') + ')';
    const expressionAttributeValues: Record<string, string> = {};
    filterStatuses.forEach((status, i) => {
      expressionAttributeValues[`:status${i}`] = status;
    });

    // Query GSI1
    if (startYear === endYear) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI1_NAME,
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
          FilterExpression: filterExpression + ' AND entityType = :entityType',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}#${startYear}`,
            ':start': startUtc,
            ':end': endUtc,
            ':entityType': 'REMINDER',
            ...expressionAttributeValues,
          },
          Limit: 100,
        })
      );
      items = (result.Items as Record<string, unknown>[]) || [];
    } else {
      // Year straddle - query both years
      const [currentYearResult, nextYearResult] = await Promise.all([
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI1_NAME,
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :start',
            FilterExpression: filterExpression + ' AND entityType = :entityType',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':pk': `USER#${userId}#${startYear}`,
              ':start': startUtc,
              ':entityType': 'REMINDER',
              ...expressionAttributeValues,
            },
          })
        ),
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI1_NAME,
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :end',
            FilterExpression: filterExpression + ' AND entityType = :entityType',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':pk': `USER#${userId}#${endYear}`,
              ':end': endUtc,
              ':entityType': 'REMINDER',
              ...expressionAttributeValues,
            },
          })
        ),
      ]);

      items = [
        ...((currentYearResult.Items as Record<string, unknown>[]) || []),
        ...((nextYearResult.Items as Record<string, unknown>[]) || []),
      ];
    }

    // Transform to response format
    const reminders = items.map((item) => transformReminder(item));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          reminders,
          meta: {
            fromDate: startUtc.split('T')[0],
            toDate: endUtc.split('T')[0],
            total: reminders.length,
          },
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getReminders:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch reminders');
  }
};

function transformReminder(item: Record<string, unknown>): Reminder {
  const reminder: Reminder = {
    reminderId: item.reminderId as string,
    title: item.title as string,
    triggerUtc: item.triggerUtc as string,
    status: item.status as ReminderStatus,
    version: item.version as number,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };

  // Only set optional properties if they have values
  if (item.note) reminder.note = item.note as string;
  if (item.triggerTzid !== undefined) reminder.triggerTzid = item.triggerTzid as string | null;
  if (item.color) reminder.color = item.color as string;
  if (item.snoozedUntil !== undefined) reminder.snoozedUntil = item.snoozedUntil as string | null;

  return reminder;
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
