/**
 * DynamoDB Event Repository Unit Tests
 *
 * Tests CRUD operations, GSI keys, version control, and Google sync.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoEventRepository } from './DynamoEventRepository.js';
import { ConflictError } from '../../../../lib/errors.js';

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoEventRepository', () => {
  let repository: DynamoEventRepository;

  beforeEach(() => {
    ddbMock.reset();
    repository = new DynamoEventRepository();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('should create simple event with correct keys', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'Team Meeting',
        description: 'Weekly sync',
        isAllDay: false,
        startUtc: '2025-11-26T14:00:00Z',
        endUtc: '2025-11-26T15:00:00Z',
      };

      const result = await repository.create(input);

      expect(result.eventId).toMatch(/^evt_/);
      expect(result.userId).toBe('usr_123');
      expect(result.title).toBe('Team Meeting');
      expect(result.description).toBe('Weekly sync');
      expect(result.version).toBe(1);
      expect(result.createdAt).toBe('2025-11-26T10:00:00.000Z');

      // Verify DynamoDB call
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls).toHaveLength(1);

      const item = putCalls[0].args[0].input.Item;
      expect(item?.PK).toBe('USER#usr_123');
      expect(item?.SK).toMatch(/^EVENT#evt_/);
      expect(item?.entityType).toBe('EVENT');
    });

    it('should create event with year-based GSI1 keys', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'New Year Event',
        isAllDay: false,
        startUtc: '2026-01-15T10:00:00Z',
        endUtc: '2026-01-15T11:00:00Z',
      };

      await repository.create(input);

      const putCalls = ddbMock.commandCalls(PutCommand);
      const item = putCalls[0].args[0].input.Item;

      expect(item?.GSI1PK).toBe('USER#usr_123#2026');
      expect(item?.GSI1SK).toBe('2026-01-15T10:00:00Z');
    });

    it('should create recurring MASTER event with GSI2 keys', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'Daily Standup',
        isAllDay: false,
        startUtc: '2025-11-26T09:00:00Z',
        endUtc: '2025-11-26T09:15:00Z',
        rrule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
      };

      const result = await repository.create(input);

      expect(result.rrule).toBe('FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR');
      expect(result.recurType).toBe('MASTER');

      const putCalls = ddbMock.commandCalls(PutCommand);
      const item = putCalls[0].args[0].input.Item;

      expect(item?.GSI2PK).toBe('USER#usr_123#RECURRING');
      expect(item?.GSI2SK).toMatch(/^2025-11-26T09:00:00Z#evt_/);
    });

    it('should create INSTANCE event with masterEventId', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'Daily Standup (Exception)',
        isAllDay: false,
        startUtc: '2025-11-27T10:00:00Z', // Moved from 9am to 10am
        endUtc: '2025-11-27T10:15:00Z',
        masterEventId: 'evt_master_123',
        originalStartUtc: '2025-11-27T09:00:00Z',
      };

      const result = await repository.create(input);

      expect(result.masterEventId).toBe('evt_master_123');
      expect(result.recurType).toBe('INSTANCE');
      expect(result.originalStartUtc).toBe('2025-11-27T09:00:00Z');
    });

    it('should include Google sync metadata if provided', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'Imported Event',
        isAllDay: false,
        startUtc: '2025-11-26T14:00:00Z',
        endUtc: '2025-11-26T15:00:00Z',
        googleEventId: 'google_abc123',
        googleCalendarId: 'primary',
        googleEtag: '"etag123"',
      };

      const result = await repository.create(input);

      expect(result.googleEventId).toBe('google_abc123');
      expect(result.googleCalendarId).toBe('primary');
      expect(result.googleEtag).toBe('"etag123"');
      expect(result.googleSyncedAt).toBe('2025-11-26T10:00:00.000Z');
    });

    it('should set initial version to 1', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'Test',
        isAllDay: false,
        startUtc: '2025-11-26T14:00:00Z',
        endUtc: '2025-11-26T15:00:00Z',
      };

      const result = await repository.create(input);

      expect(result.version).toBe(1);
      expect(result.sequence).toBe(0);
    });

    it('should prevent overwrites with ConditionExpression', async () => {
      ddbMock.on(PutCommand).resolves({});

      await repository.create({
        userId: 'usr_123',
        title: 'Test',
        isAllDay: false,
        startUtc: '2025-11-26T14:00:00Z',
        endUtc: '2025-11-26T15:00:00Z',
      });

      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(PK)');
    });

    it('should set default color and status', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        title: 'No Color Event',
        isAllDay: false,
        startUtc: '2025-11-26T14:00:00Z',
        endUtc: '2025-11-26T15:00:00Z',
      };

      const result = await repository.create(input);

      expect(result.color).toBe('#4285F4');
      expect(result.status).toBe('CONFIRMED');
    });

    it('should generate iCalendar UID', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create({
        userId: 'usr_123',
        title: 'Test',
        isAllDay: false,
        startUtc: '2025-11-26T14:00:00Z',
        endUtc: '2025-11-26T15:00:00Z',
      });

      expect(result.icalUid).toMatch(/^evt_.*@nexus\.app$/);
    });
  });

  describe('findById', () => {
    it('should return event when found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: 'USER#usr_123',
          SK: 'EVENT#evt_456',
          eventId: 'evt_456',
          title: 'Found Event',
          description: 'Description',
          isAllDay: false,
          startUtc: '2025-11-26T14:00:00Z',
          endUtc: '2025-11-26T15:00:00Z',
          startTzid: null,
          endTzid: null,
          location: null,
          color: '#4285F4',
          status: 'CONFIRMED',
          links: [],
          version: 1,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
          icalUid: 'evt_456@nexus.app',
          sequence: 0,
        },
      });

      const result = await repository.findById('usr_123', 'evt_456');

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('evt_456');
      expect(result?.userId).toBe('usr_123');
      expect(result?.title).toBe('Found Event');

      // Verify correct keys used
      const getCalls = ddbMock.commandCalls(GetCommand);
      expect(getCalls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'EVENT#evt_456',
      });
    });

    it('should return null when not found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined,
      });

      const result = await repository.findById('usr_123', 'evt_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update event with version increment', async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          PK: 'USER#usr_123',
          SK: 'EVENT#evt_456',
          eventId: 'evt_456',
          title: 'Updated Title',
          description: 'Old description',
          isAllDay: false,
          startUtc: '2025-11-26T14:00:00Z',
          endUtc: '2025-11-26T15:00:00Z',
          startTzid: null,
          endTzid: null,
          location: null,
          color: '#4285F4',
          status: 'CONFIRMED',
          links: [],
          version: 2,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
          icalUid: 'evt_456@nexus.app',
          sequence: 0,
        },
      });

      const result = await repository.update('usr_123', 'evt_456', { title: 'Updated Title' }, 1);

      expect(result.title).toBe('Updated Title');
      expect(result.version).toBe(2);
    });

    it('should enforce optimistic locking via version check', async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          PK: 'USER#usr_123',
          SK: 'EVENT#evt_456',
          eventId: 'evt_456',
          title: 'Test',
          description: null,
          isAllDay: false,
          startUtc: '2025-11-26T14:00:00Z',
          endUtc: '2025-11-26T15:00:00Z',
          startTzid: null,
          endTzid: null,
          location: null,
          color: '#4285F4',
          status: 'CONFIRMED',
          links: [],
          version: 3,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
          icalUid: 'evt_456@nexus.app',
          sequence: 0,
        },
      });

      await repository.update('usr_123', 'evt_456', { title: 'Test' }, 2);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls[0].args[0].input.ConditionExpression).toBe('version = :expectedVersion');
      expect(updateCalls[0].args[0].input.ExpressionAttributeValues?.[':expectedVersion']).toBe(2);
    });

    it('should throw ConflictError on version mismatch', async () => {
      const conditionalError = new Error('ConditionalCheckFailedException');
      conditionalError.name = 'ConditionalCheckFailedException';
      ddbMock.on(UpdateCommand).rejects(conditionalError);

      await expect(
        repository.update('usr_123', 'evt_456', { title: 'Test' }, 1)
      ).rejects.toThrow(ConflictError);

      await expect(
        repository.update('usr_123', 'evt_456', { title: 'Test' }, 1)
      ).rejects.toThrow('Event was modified by another process');
    });

    it('should update multiple fields', async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          PK: 'USER#usr_123',
          SK: 'EVENT#evt_456',
          eventId: 'evt_456',
          title: 'New Title',
          description: 'New Description',
          isAllDay: true,
          startUtc: '2025-11-27T00:00:00Z',
          endUtc: '2025-11-28T00:00:00Z',
          startTzid: null,
          endTzid: null,
          location: 'New Location',
          color: '#FF0000',
          status: 'TENTATIVE',
          links: [],
          version: 2,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
          icalUid: 'evt_456@nexus.app',
          sequence: 0,
        },
      });

      const result = await repository.update(
        'usr_123',
        'evt_456',
        {
          title: 'New Title',
          description: 'New Description',
          isAllDay: true,
          startUtc: '2025-11-27T00:00:00Z',
          endUtc: '2025-11-28T00:00:00Z',
          location: 'New Location',
          color: '#FF0000',
          status: 'TENTATIVE',
        },
        1
      );

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Description');
      expect(result.isAllDay).toBe(true);
      expect(result.location).toBe('New Location');
      expect(result.color).toBe('#FF0000');
      expect(result.status).toBe('TENTATIVE');
    });

    it('should update Google sync fields', async () => {
      ddbMock.on(UpdateCommand).resolves({
        Attributes: {
          PK: 'USER#usr_123',
          SK: 'EVENT#evt_456',
          eventId: 'evt_456',
          title: 'Test',
          description: null,
          isAllDay: false,
          startUtc: '2025-11-26T14:00:00Z',
          endUtc: '2025-11-26T15:00:00Z',
          startTzid: null,
          endTzid: null,
          location: null,
          color: '#4285F4',
          status: 'CONFIRMED',
          links: [],
          version: 2,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
          icalUid: 'evt_456@nexus.app',
          sequence: 0,
          googleSyncedAt: '2025-11-26T10:00:00.000Z',
          googleEtag: '"newetag"',
        },
      });

      const result = await repository.update(
        'usr_123',
        'evt_456',
        {
          googleSyncedAt: '2025-11-26T10:00:00.000Z',
          googleEtag: '"newetag"',
        },
        1
      );

      expect(result.googleSyncedAt).toBe('2025-11-26T10:00:00.000Z');
      expect(result.googleEtag).toBe('"newetag"');
    });
  });

  describe('delete', () => {
    it('should delete event with correct keys', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await repository.delete('usr_123', 'evt_456');

      const deleteCalls = ddbMock.commandCalls(DeleteCommand);
      expect(deleteCalls).toHaveLength(1);
      expect(deleteCalls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'EVENT#evt_456',
      });
    });
  });

  describe('findGoogleSyncedEvents', () => {
    it('should query events with googleEventId', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            eventId: 'evt_1',
            googleEventId: 'google_1',
            googleSyncedAt: '2025-11-25T10:00:00.000Z',
            googleEtag: '"etag1"',
            updatedAt: '2025-11-25T10:00:00.000Z',
            version: 1,
          },
          {
            eventId: 'evt_2',
            googleEventId: 'google_2',
            googleSyncedAt: '2025-11-25T11:00:00.000Z',
            googleEtag: '"etag2"',
            updatedAt: '2025-11-25T12:00:00.000Z',
            version: 2,
          },
        ],
      });

      const result = await repository.findGoogleSyncedEvents('usr_123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        eventId: 'evt_1',
        googleEventId: 'google_1',
        googleSyncedAt: '2025-11-25T10:00:00.000Z',
        googleEtag: '"etag1"',
        updatedAt: '2025-11-25T10:00:00.000Z',
        version: 1,
      });

      // Verify query params
      const queryCalls = ddbMock.commandCalls(QueryCommand);
      expect(queryCalls[0].args[0].input.KeyConditionExpression).toBe(
        'PK = :pk AND begins_with(SK, :skPrefix)'
      );
      expect(queryCalls[0].args[0].input.FilterExpression).toBe(
        'attribute_exists(googleEventId)'
      );
    });

    it('should return empty array if no synced events', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const result = await repository.findGoogleSyncedEvents('usr_123');

      expect(result).toEqual([]);
    });

    it('should return empty array if Items is undefined', async () => {
      ddbMock.on(QueryCommand).resolves({});

      const result = await repository.findGoogleSyncedEvents('usr_123');

      expect(result).toEqual([]);
    });
  });
});
