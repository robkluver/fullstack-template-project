/**
 * GET /users/:userId/agenda
 *
 * Retrieves the week/agenda view for a user.
 * This is the most common operation (90.9% of queries).
 *
 * Query Parameters:
 *   - from: ISO 8601 date to start from (default: today)
 *   - days: Number of days to fetch (default: 7)
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md (AP1: Week/Agenda View)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME } from '../../infrastructure/storage/dynamodb/client.js';

interface AgendaEvent {
  eventId: string;
  title: string;
  startUtc: string;
  endUtc: string;
  startTzid?: string | null;
  isAllDay: boolean;
  location?: string | null;
  color?: string;
  entityType: string;
}

interface AgendaDay {
  date: string;
  dayName: string;
  isToday: boolean;
  events: AgendaEvent[];
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

    // 99.9% of queries: Single year (single query)
    if (startYear === endYear) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: GSI1_NAME,
          KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}#${startYear}`,
            ':start': startUtc,
            ':end': endUtc,
          },
          Limit: 200,
        })
      );
      items = (result.Items as Record<string, unknown>[]) || [];
    } else {
      // 0.1% of queries: Year straddle (Dec 25-31)
      const [currentYearResult, nextYearResult] = await Promise.all([
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI1_NAME,
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK >= :start',
            ExpressionAttributeValues: {
              ':pk': `USER#${userId}#${startYear}`,
              ':start': startUtc,
            },
          })
        ),
        docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: GSI1_NAME,
            KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :end',
            ExpressionAttributeValues: {
              ':pk': `USER#${userId}#${endYear}`,
              ':end': endUtc,
            },
          })
        ),
      ]);

      items = [
        ...((currentYearResult.Items as Record<string, unknown>[]) || []),
        ...((nextYearResult.Items as Record<string, unknown>[]) || []),
      ];
    }

    // Group events by date
    const agenda = groupEventsByDate(items, fromDate, days);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          agenda,
          meta: {
            fromDate: startUtc.split('T')[0],
            toDate: endUtc.split('T')[0],
            totalEvents: items.length,
          },
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getAgenda:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve agenda');
  }
};

function groupEventsByDate(
  items: Record<string, unknown>[],
  startDate: Date,
  days: number
): AgendaDay[] {
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Create day buckets
  const agenda: AgendaDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0] ?? '';
    const dayIndex = date.getDay();

    agenda.push({
      date: dateStr,
      dayName: dayNames[dayIndex] ?? 'Unknown',
      isToday: dateStr === today,
      events: [],
    });
  }

  // Sort items into day buckets
  for (const item of items) {
    const startUtc = item.startUtc as string;
    if (!startUtc) continue;

    const eventDate = startUtc.split('T')[0];
    const dayBucket = agenda.find((d) => d.date === eventDate);

    if (dayBucket) {
      const agendaEvent: AgendaEvent = {
        eventId: item.eventId as string,
        title: item.title as string,
        startUtc: item.startUtc as string,
        endUtc: item.endUtc as string,
        isAllDay: item.isAllDay as boolean,
        entityType: item.entityType as string,
      };
      // Only set optional properties if they have defined values
      if (item.startTzid !== undefined) agendaEvent.startTzid = item.startTzid as string | null;
      if (item.location !== undefined) agendaEvent.location = item.location as string | null;
      if (item.color) agendaEvent.color = item.color as string;
      else agendaEvent.color = '#4285F4';
      dayBucket.events.push(agendaEvent);
    }
  }

  // Sort events within each day by start time
  for (const day of agenda) {
    day.events.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  }

  return agenda;
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
