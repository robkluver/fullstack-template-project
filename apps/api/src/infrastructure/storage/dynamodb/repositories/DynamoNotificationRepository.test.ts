/**
 * DynamoDB Notification Repository Unit Tests
 *
 * Tests notification CRUD operations.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
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
} from '@aws-sdk/lib-dynamodb';
import { DynamoNotificationRepository } from './DynamoNotificationRepository.js';

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoNotificationRepository', () => {
  let repository: DynamoNotificationRepository;

  beforeEach(() => {
    ddbMock.reset();
    repository = new DynamoNotificationRepository();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('should create notification with correct keys and return it', async () => {
      ddbMock.on(PutCommand).resolves({});

      const input = {
        userId: 'usr_123',
        type: 'GOOGLE_IMPORT',
        title: 'Import Complete',
        message: '10 events imported',
        metadata: { imported: 10, skipped: 0 },
      };

      const result = await repository.create(input);

      expect(result.notificationId).toMatch(/^notif_/);
      expect(result.userId).toBe('usr_123');
      expect(result.type).toBe('GOOGLE_IMPORT');
      expect(result.title).toBe('Import Complete');
      expect(result.message).toBe('10 events imported');
      expect(result.metadata).toEqual({ imported: 10, skipped: 0 });
      expect(result.readAt).toBeNull();
      expect(result.createdAt).toBe('2025-11-26T10:00:00.000Z');

      // Verify DynamoDB call
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls).toHaveLength(1);
      const item = putCalls[0].args[0].input.Item;
      expect(item?.PK).toBe('USER#usr_123');
      expect(item?.SK).toMatch(/^NOTIFICATION#notif_/);
      expect(item?.entityType).toBe('NOTIFICATION');
    });

    it('should handle empty metadata', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await repository.create({
        userId: 'usr_123',
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
      });

      expect(result.metadata).toBeUndefined();

      const putCalls = ddbMock.commandCalls(PutCommand);
      const item = putCalls[0].args[0].input.Item;
      expect(item?.metadata).toEqual({});
    });

    it('should generate unique notification IDs', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result1 = await repository.create({
        userId: 'usr_123',
        type: 'INFO',
        title: 'Test 1',
        message: 'Message 1',
      });

      const result2 = await repository.create({
        userId: 'usr_123',
        type: 'INFO',
        title: 'Test 2',
        message: 'Message 2',
      });

      expect(result1.notificationId).not.toBe(result2.notificationId);
    });
  });

  describe('findById', () => {
    it('should return notification when found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: 'USER#usr_123',
          SK: 'NOTIFICATION#notif_abc',
          notificationId: 'notif_abc',
          userId: 'usr_123',
          type: 'GOOGLE_IMPORT',
          title: 'Import Complete',
          message: '5 events imported',
          metadata: { imported: 5 },
          readAt: null,
          createdAt: '2025-11-26T09:00:00.000Z',
        },
      });

      const result = await repository.findById('usr_123', 'notif_abc');

      expect(result).not.toBeNull();
      expect(result?.notificationId).toBe('notif_abc');
      expect(result?.userId).toBe('usr_123');
      expect(result?.type).toBe('GOOGLE_IMPORT');
      expect(result?.title).toBe('Import Complete');
      expect(result?.readAt).toBeNull();

      // Verify correct keys used
      const getCalls = ddbMock.commandCalls(GetCommand);
      expect(getCalls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
      });
    });

    it('should return null when notification not found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined,
      });

      const result = await repository.findById('usr_123', 'notif_nonexistent');

      expect(result).toBeNull();
    });

    it('should return notification with readAt when read', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          notificationId: 'notif_read',
          userId: 'usr_123',
          type: 'INFO',
          title: 'Read Notification',
          message: 'Already read',
          metadata: {},
          readAt: '2025-11-26T09:30:00.000Z',
          createdAt: '2025-11-26T09:00:00.000Z',
        },
      });

      const result = await repository.findById('usr_123', 'notif_read');

      expect(result?.readAt).toBe('2025-11-26T09:30:00.000Z');
    });
  });

  describe('markAsRead', () => {
    it('should update readAt timestamp', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.markAsRead('usr_123', 'notif_abc');

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const input = updateCalls[0].args[0].input;
      expect(input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
      });
      expect(input.UpdateExpression).toBe('SET readAt = :now');
      expect(input.ExpressionAttributeValues?.[':now']).toBe('2025-11-26T10:00:00.000Z');
    });
  });

  describe('delete', () => {
    it('should delete notification with correct keys', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await repository.delete('usr_123', 'notif_to_delete');

      const deleteCalls = ddbMock.commandCalls(DeleteCommand);
      expect(deleteCalls).toHaveLength(1);

      const input = deleteCalls[0].args[0].input;
      expect(input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_to_delete',
      });
    });
  });
});
