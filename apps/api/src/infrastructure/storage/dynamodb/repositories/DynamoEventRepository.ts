/**
 * DynamoDB Event Repository
 *
 * Implements EventRepository interface for DynamoDB storage.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md
 */

import { injectable } from 'tsyringe';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client.js';
import type {
  EventRepository,
} from '../../../../domain/interfaces/EventRepository.js';
import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  EventSyncInfo,
} from '../../../../domain/entities/CalendarEvent.js';
import { randomUUID } from 'crypto';
import { NotFoundError, ConflictError } from '../../../../lib/errors.js';

@injectable()
export class DynamoEventRepository implements EventRepository {
  async create(input: CreateEventInput): Promise<CalendarEvent> {
    const eventId = `evt_${randomUUID()}`;
    const now = new Date().toISOString();
    const year = input.startUtc.substring(0, 4);

    const item: Record<string, unknown> = {
      // Base table keys
      PK: `USER#${input.userId}`,
      SK: `EVENT#${eventId}`,

      // GSI1 keys (year-based partitioning)
      GSI1PK: `USER#${input.userId}#${year}`,
      GSI1SK: input.startUtc,

      // Core attributes
      entityType: 'EVENT',
      eventId,
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,

      // Temporal attributes
      isAllDay: input.isAllDay,
      startUtc: input.startUtc,
      endUtc: input.endUtc,
      startTzid: input.startTzid ?? null,
      endTzid: input.endTzid ?? null,

      // Metadata
      location: input.location ?? null,
      color: input.color || '#4285F4',
      status: input.status || 'CONFIRMED',

      // Cross-linking
      links: [],

      // Version control
      version: 1,
      createdAt: now,
      updatedAt: now,

      // iCalendar compatibility
      icalUid: `${eventId}@nexus.app`,
      sequence: 0,
    };

    // Handle recurring events
    if (input.rrule) {
      item.rrule = input.rrule;
      item.recurType = 'MASTER';
      item.GSI2PK = `USER#${input.userId}#RECURRING`;
      item.GSI2SK = `${input.startUtc}#${eventId}`;
    }

    if (input.masterEventId) {
      item.masterEventId = input.masterEventId;
      item.recurType = 'INSTANCE';
      item.originalStartUtc = input.originalStartUtc;
    }

    // Google sync metadata
    if (input.googleEventId) {
      item.googleEventId = input.googleEventId;
      item.googleCalendarId = input.googleCalendarId;
      item.googleSyncedAt = now;
      item.googleEtag = input.googleEtag;
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    return this.itemToEvent(item);
  }

  async findById(userId: string, eventId: string): Promise<CalendarEvent | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `EVENT#${eventId}`,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return this.itemToEvent(result.Item);
  }

  async update(
    userId: string,
    eventId: string,
    input: UpdateEventInput,
    expectedVersion: number
  ): Promise<CalendarEvent> {
    const updateExpressions: string[] = ['updatedAt = :now', 'version = version + :one'];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {
      ':now': new Date().toISOString(),
      ':one': 1,
      ':expectedVersion': expectedVersion,
    };

    if (input.title !== undefined) {
      updateExpressions.push('title = :title');
      expressionAttributeValues[':title'] = input.title;
    }
    if (input.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = input.description;
    }
    if (input.isAllDay !== undefined) {
      updateExpressions.push('isAllDay = :isAllDay');
      expressionAttributeValues[':isAllDay'] = input.isAllDay;
    }
    if (input.startUtc !== undefined) {
      updateExpressions.push('startUtc = :startUtc');
      expressionAttributeValues[':startUtc'] = input.startUtc;
    }
    if (input.endUtc !== undefined) {
      updateExpressions.push('endUtc = :endUtc');
      expressionAttributeValues[':endUtc'] = input.endUtc;
    }
    if (input.startTzid !== undefined) {
      updateExpressions.push('startTzid = :startTzid');
      expressionAttributeValues[':startTzid'] = input.startTzid;
    }
    if (input.endTzid !== undefined) {
      updateExpressions.push('endTzid = :endTzid');
      expressionAttributeValues[':endTzid'] = input.endTzid;
    }
    if (input.location !== undefined) {
      updateExpressions.push('#loc = :location');
      expressionAttributeNames['#loc'] = 'location';
      expressionAttributeValues[':location'] = input.location;
    }
    if (input.color !== undefined) {
      updateExpressions.push('color = :color');
      expressionAttributeValues[':color'] = input.color;
    }
    if (input.status !== undefined) {
      updateExpressions.push('#st = :status');
      expressionAttributeNames['#st'] = 'status';
      expressionAttributeValues[':status'] = input.status;
    }
    if (input.googleSyncedAt !== undefined) {
      updateExpressions.push('googleSyncedAt = :syncedAt');
      expressionAttributeValues[':syncedAt'] = input.googleSyncedAt;
    }
    if (input.googleEtag !== undefined) {
      updateExpressions.push('googleEtag = :etag');
      expressionAttributeValues[':etag'] = input.googleEtag;
    }

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `EVENT#${eventId}`,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ConditionExpression: 'version = :expectedVersion',
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
            ? expressionAttributeNames
            : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        })
      );

      return this.itemToEvent(result.Attributes!);
    } catch (error) {
      if ((error as Error).name === 'ConditionalCheckFailedException') {
        throw new ConflictError('Event was modified by another process', 'VERSION_CONFLICT');
      }
      throw error;
    }
  }

  async delete(userId: string, eventId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `EVENT#${eventId}`,
        },
      })
    );
  }

  async findGoogleSyncedEvents(userId: string): Promise<EventSyncInfo[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        FilterExpression: 'attribute_exists(googleEventId)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':skPrefix': 'EVENT#',
        },
        ProjectionExpression: 'eventId, googleEventId, googleSyncedAt, googleEtag, updatedAt, version',
      })
    );

    return (result.Items || []).map((item) => ({
      eventId: item.eventId,
      googleEventId: item.googleEventId,
      googleSyncedAt: item.googleSyncedAt,
      googleEtag: item.googleEtag,
      updatedAt: item.updatedAt,
      version: item.version,
    }));
  }

  private itemToEvent(item: Record<string, unknown>): CalendarEvent {
    return {
      eventId: item.eventId as string,
      userId: (item.PK as string).replace('USER#', ''),
      title: item.title as string,
      description: item.description as string | null,
      isAllDay: item.isAllDay as boolean,
      startUtc: item.startUtc as string,
      endUtc: item.endUtc as string,
      startTzid: item.startTzid as string | null,
      endTzid: item.endTzid as string | null,
      location: item.location as string | null,
      color: item.color as string,
      status: item.status as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED',
      links: item.links as string[],
      version: item.version as number,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
      icalUid: item.icalUid as string,
      sequence: item.sequence as number,
      rrule: item.rrule as string | undefined,
      recurType: item.recurType as 'MASTER' | 'INSTANCE' | undefined,
      masterEventId: item.masterEventId as string | undefined,
      originalStartUtc: item.originalStartUtc as string | undefined,
      googleEventId: item.googleEventId as string | undefined,
      googleCalendarId: item.googleCalendarId as string | undefined,
      googleSyncedAt: item.googleSyncedAt as string | undefined,
      googleEtag: item.googleEtag as string | undefined,
    };
  }
}
