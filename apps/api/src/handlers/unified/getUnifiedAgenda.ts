/**
 * GET /users/:userId/unified-agenda
 *
 * Retrieves a unified agenda view combining events, tasks, and reminders.
 * AP31: Unified Agenda (Events + Tasks + Reminders)
 *
 * Query Parameters:
 *   - from: ISO 8601 date to start from (default: today)
 *   - days: Number of days to fetch (default: 7)
 *   - types: Comma-separated entity types to include (default: all)
 *
 * @see docs/backend/dynamodb-spec/07-PHASE5-CROSS-LINKING.md (AP31)
 * @see docs/backend/dynamodb-spec/08-REST-API.md (endpoint contract)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME } from '../../infrastructure/storage/dynamodb/client.js';

// Entity types for unified agenda
type EntityType = 'EVENT' | 'INSTANCE' | 'TASK' | 'REMINDER' | 'NOTE';

// Unified item shape
interface AgendaItem {
  entityType: EntityType;
  id: string;
  title: string;
  datetime: string; // Sort key (startUtc for events, dueUtc for tasks, triggerUtc for reminders)
  color?: string;
  // Event-specific
  endUtc?: string;
  isAllDay?: boolean;
  location?: string | null;
  // Task-specific
  status?: string;
  priority?: number;
  effort?: number;
  // Reminder-specific
  reminderStatus?: string;
  snoozedUntil?: string | null;
  // Note-specific
  isPinned?: boolean;
  body?: string;
}

interface AgendaDay {
  date: string;
  dayName: string;
  isToday: boolean;
  items: AgendaItem[];
}

// Relevant entity types for the unified agenda
const AGENDA_ENTITY_TYPES = new Set(['EVENT', 'INSTANCE', 'TASK', 'REMINDER']);

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
    const typesParam = event.queryStringParameters?.types;

    // Filter by entity types if specified
    const allowedTypes = typesParam
      ? new Set(typesParam.split(',').map((t) => t.trim().toUpperCase()))
      : AGENDA_ENTITY_TYPES;

    if (isNaN(fromDate.getTime())) {
      return errorResponse(400, 'INVALID_DATE', 'from parameter must be valid ISO 8601 date');
    }

    // Normalize start date to beginning of day
    fromDate.setHours(0, 0, 0, 0);

    // Calculate date range
    const startUtc = fromDate.toISOString();
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() + days);
    const endUtc = endDate.toISOString();

    const startYear = fromDate.getFullYear();
    const endYear = endDate.getFullYear();

    let items: Record<string, unknown>[] = [];

    // Query GSI1 for all entities in date range
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
          Limit: 500,
        })
      );
      items = (result.Items as Record<string, unknown>[]) || [];
    } else {
      // Year straddle
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

    // Filter by entity type and transform
    const filteredItems = items.filter((item) => {
      const entityType = item.entityType as string;
      return allowedTypes.has(entityType);
    });

    // Group items by date
    const agenda = groupItemsByDate(filteredItems, fromDate, days);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: {
          agenda,
          meta: {
            fromDate: startUtc.split('T')[0],
            toDate: endUtc.split('T')[0],
            totalItems: filteredItems.length,
            byType: countByType(filteredItems),
          },
        },
        error: null,
      }),
    };
  } catch (error) {
    console.error('Error in getUnifiedAgenda:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve unified agenda');
  }
};

function transformItem(item: Record<string, unknown>): AgendaItem | null {
  const entityType = item.entityType as EntityType;

  switch (entityType) {
    case 'EVENT':
    case 'INSTANCE': {
      const agendaItem: AgendaItem = {
        entityType,
        id: item.eventId as string,
        title: item.title as string,
        datetime: item.startUtc as string,
        endUtc: item.endUtc as string,
        isAllDay: (item.isAllDay as boolean) || false,
      };
      if (item.color) agendaItem.color = item.color as string;
      if (item.location) agendaItem.location = item.location as string;
      return agendaItem;
    }

    case 'TASK': {
      // Tasks use dueUtc or startUtc for sorting
      const datetime = (item.dueUtc || item.startUtc || item.GSI1SK) as string;
      if (!datetime) return null;

      const agendaItem: AgendaItem = {
        entityType,
        id: item.taskId as string,
        title: item.title as string,
        datetime,
        status: item.status as string,
        priority: item.priority as number,
      };
      if (item.color) agendaItem.color = item.color as string;
      if (item.effort) agendaItem.effort = item.effort as number;
      return agendaItem;
    }

    case 'REMINDER': {
      const agendaItem: AgendaItem = {
        entityType,
        id: item.reminderId as string,
        title: item.title as string,
        datetime: item.triggerUtc as string,
        reminderStatus: item.status as string,
      };
      if (item.color) agendaItem.color = item.color as string;
      if (item.snoozedUntil) agendaItem.snoozedUntil = item.snoozedUntil as string;
      return agendaItem;
    }

    case 'NOTE': {
      const agendaItem: AgendaItem = {
        entityType,
        id: item.noteId as string,
        title: item.title as string,
        datetime: item.createdAt as string,
        isPinned: (item.isPinned as boolean) || false,
      };
      if (item.color) agendaItem.color = item.color as string;
      if (item.body) agendaItem.body = (item.body as string).slice(0, 200);
      return agendaItem;
    }

    default:
      return null;
  }
}

function groupItemsByDate(
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
      items: [],
    });
  }

  // Sort items into day buckets
  for (const item of items) {
    const transformed = transformItem(item);
    if (!transformed) continue;

    const itemDate = transformed.datetime.split('T')[0];
    const dayBucket = agenda.find((d) => d.date === itemDate);

    if (dayBucket) {
      dayBucket.items.push(transformed);
    }
  }

  // Sort items within each day by datetime, then by priority for tasks
  for (const day of agenda) {
    day.items.sort((a, b) => {
      const timeCompare = a.datetime.localeCompare(b.datetime);
      if (timeCompare !== 0) return timeCompare;
      // Secondary sort by priority (P1 first) for tasks
      if (a.entityType === 'TASK' && b.entityType === 'TASK') {
        return (a.priority || 5) - (b.priority || 5);
      }
      return 0;
    });
  }

  return agenda;
}

function countByType(items: Record<string, unknown>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const type = item.entityType as string;
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
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
