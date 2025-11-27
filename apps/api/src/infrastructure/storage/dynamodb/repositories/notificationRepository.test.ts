/**
 * NotificationRepository Unit Tests
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import {
  createNotification,
  getNotificationById,
  listNotifications,
  getUnreadCount,
  getUnreadNotifications,
  updateNotificationStatus,
  deleteNotification,
  toNotification,
  type NotificationRecord,
} from './notificationRepository.js';

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('NotificationRepository', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createNotification', () => {
    it('should create a notification with correct keys', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await createNotification({
        userId: 'usr_123',
        type: 'GOOGLE_IMPORT',
        title: 'Import Complete',
        message: '10 events imported',
        metadata: { imported: 10, skipped: 0, conflicts: [] },
      });

      // Verify notification ID format (notif_ prefix + UUID)
      expect(result.notificationId).toMatch(/^notif_[a-f0-9-]{36}$/);
      expect(result.PK).toBe('USER#usr_123');
      expect(result.SK).toBe(`NOTIFICATION#${result.notificationId}`);
      expect(result.GSI1PK).toBe('USER#usr_123#2025');
      expect(result.GSI3PK).toBe('USER#usr_123#NOTIF#UNREAD');
      expect(result.status).toBe('UNREAD');
      expect(result.type).toBe('GOOGLE_IMPORT');
      expect(result.title).toBe('Import Complete');
      expect(result.message).toBe('10 events imported');
      expect(result.version).toBe(1);
      expect(result.ttl).toBeDefined();

      // Verify DynamoDB call
      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(PK)');
    });

    it('should use custom TTL when provided', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await createNotification({
        userId: 'usr_123',
        type: 'SYSTEM',
        title: 'Test',
        ttlDays: 7,
      });

      // TTL should be 7 days from now
      const expectedTtl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      expect(result.ttl).toBe(expectedTtl);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when found', async () => {
      const mockNotification: NotificationRecord = {
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
        GSI1PK: 'USER#usr_123#2025',
        GSI1SK: '2025-11-26T10:00:00.000Z',
        GSI3PK: 'USER#usr_123#NOTIF#UNREAD',
        GSI3SK: '2025-11-26T10:00:00.000Z',
        entityType: 'NOTIFICATION',
        notificationId: 'notif_abc',
        type: 'GOOGLE_IMPORT',
        title: 'Import Complete',
        status: 'UNREAD',
        version: 1,
        createdAt: '2025-11-26T10:00:00.000Z',
        updatedAt: '2025-11-26T10:00:00.000Z',
      };

      ddbMock.on(GetCommand).resolves({ Item: mockNotification });

      const result = await getNotificationById('usr_123', 'notif_abc');

      expect(result).toEqual(mockNotification);

      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
      });
    });

    it('should return null/undefined when not found', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await getNotificationById('usr_123', 'notif_nonexistent');

      expect(result).toBeFalsy();
    });
  });

  describe('listNotifications', () => {
    it('should query GSI1 with correct parameters', async () => {
      const mockNotifications: NotificationRecord[] = [
        {
          PK: 'USER#usr_123',
          SK: 'NOTIFICATION#notif_1',
          GSI1PK: 'USER#usr_123#2025',
          GSI1SK: '2025-11-26T10:00:00.000Z',
          GSI3PK: 'USER#usr_123#NOTIF#UNREAD',
          GSI3SK: '2025-11-26T10:00:00.000Z',
          entityType: 'NOTIFICATION',
          notificationId: 'notif_1',
          type: 'GOOGLE_IMPORT',
          title: 'Import 1',
          status: 'UNREAD',
          version: 1,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: mockNotifications });

      const result = await listNotifications('usr_123', { limit: 10, year: 2025 });

      expect(result).toHaveLength(1);
      expect(result[0].notificationId).toBe('notif_1');

      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.IndexName).toBe('GSI1-YearView');
      expect(calls[0].args[0].input.KeyConditionExpression).toBe('GSI1PK = :pk');
      expect(calls[0].args[0].input.ExpressionAttributeValues).toEqual({
        ':pk': 'USER#usr_123#2025',
        ':type': 'NOTIFICATION',
      });
      expect(calls[0].args[0].input.ScanIndexForward).toBe(false);
      expect(calls[0].args[0].input.Limit).toBe(10);
    });

    it('should use current year as default', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      await listNotifications('usr_123');

      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.ExpressionAttributeValues?.[':pk']).toBe('USER#usr_123#2025');
    });
  });

  describe('getUnreadCount', () => {
    it('should return count from GSI3', async () => {
      ddbMock.on(QueryCommand).resolves({ Count: 5 });

      const count = await getUnreadCount('usr_123');

      expect(count).toBe(5);

      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.IndexName).toBe('GSI3-TaskStatus');
      expect(calls[0].args[0].input.KeyConditionExpression).toBe('GSI3PK = :pk');
      expect(calls[0].args[0].input.ExpressionAttributeValues).toEqual({
        ':pk': 'USER#usr_123#NOTIF#UNREAD',
      });
      expect(calls[0].args[0].input.Select).toBe('COUNT');
    });

    it('should return 0 when no unread notifications', async () => {
      ddbMock.on(QueryCommand).resolves({ Count: undefined });

      const count = await getUnreadCount('usr_123');

      expect(count).toBe(0);
    });
  });

  describe('getUnreadNotifications', () => {
    it('should query GSI3 for unread notifications', async () => {
      const mockNotifications: NotificationRecord[] = [
        {
          PK: 'USER#usr_123',
          SK: 'NOTIFICATION#notif_1',
          GSI1PK: 'USER#usr_123#2025',
          GSI1SK: '2025-11-26T10:00:00.000Z',
          GSI3PK: 'USER#usr_123#NOTIF#UNREAD',
          GSI3SK: '2025-11-26T10:00:00.000Z',
          entityType: 'NOTIFICATION',
          notificationId: 'notif_1',
          type: 'SYSTEM',
          title: 'Unread notification',
          status: 'UNREAD',
          version: 1,
          createdAt: '2025-11-26T10:00:00.000Z',
          updatedAt: '2025-11-26T10:00:00.000Z',
        },
      ];

      ddbMock.on(QueryCommand).resolves({ Items: mockNotifications });

      const result = await getUnreadNotifications('usr_123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('UNREAD');

      const calls = ddbMock.commandCalls(QueryCommand);
      expect(calls[0].args[0].input.IndexName).toBe('GSI3-TaskStatus');
    });
  });

  describe('updateNotificationStatus', () => {
    it('should mark notification as READ with timestamp', async () => {
      const updatedNotification: NotificationRecord = {
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
        GSI1PK: 'USER#usr_123#2025',
        GSI1SK: '2025-11-26T10:00:00.000Z',
        GSI3PK: 'USER#usr_123#NOTIF#READ',
        GSI3SK: '2025-11-26T10:00:00.000Z',
        entityType: 'NOTIFICATION',
        notificationId: 'notif_abc',
        type: 'GOOGLE_IMPORT',
        title: 'Import Complete',
        status: 'READ',
        readAt: '2025-11-26T10:00:00.000Z',
        version: 2,
        createdAt: '2025-11-26T09:00:00.000Z',
        updatedAt: '2025-11-26T10:00:00.000Z',
      };

      ddbMock.on(UpdateCommand).resolves({ Attributes: updatedNotification });

      const result = await updateNotificationStatus('usr_123', 'notif_abc', 'READ', 1);

      expect(result.status).toBe('READ');
      expect(result.readAt).toBe('2025-11-26T10:00:00.000Z');
      expect(result.version).toBe(2);

      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls[0].args[0].input.ConditionExpression).toBe('#version = :expectedVersion');
      expect(calls[0].args[0].input.ExpressionAttributeValues?.[':newGsi3pk']).toBe('USER#usr_123#NOTIF#READ');
    });

    it('should mark notification as DISMISSED without readAt', async () => {
      const updatedNotification: NotificationRecord = {
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
        GSI1PK: 'USER#usr_123#2025',
        GSI1SK: '2025-11-26T10:00:00.000Z',
        GSI3PK: 'USER#usr_123#NOTIF#DISMISSED',
        GSI3SK: '2025-11-26T10:00:00.000Z',
        entityType: 'NOTIFICATION',
        notificationId: 'notif_abc',
        type: 'GOOGLE_IMPORT',
        title: 'Import Complete',
        status: 'DISMISSED',
        readAt: undefined,
        version: 2,
        createdAt: '2025-11-26T09:00:00.000Z',
        updatedAt: '2025-11-26T10:00:00.000Z',
      };

      ddbMock.on(UpdateCommand).resolves({ Attributes: updatedNotification });

      const result = await updateNotificationStatus('usr_123', 'notif_abc', 'DISMISSED', 1);

      expect(result.status).toBe('DISMISSED');
      expect(result.readAt).toBeUndefined();

      const calls = ddbMock.commandCalls(UpdateCommand);
      expect(calls[0].args[0].input.ExpressionAttributeValues?.[':readAt']).toBeUndefined();
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification with correct keys', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      await deleteNotification('usr_123', 'notif_abc');

      const calls = ddbMock.commandCalls(DeleteCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
      });
    });
  });

  describe('toNotification', () => {
    it('should transform NotificationRecord to Notification', () => {
      const record: NotificationRecord = {
        PK: 'USER#usr_123',
        SK: 'NOTIFICATION#notif_abc',
        GSI1PK: 'USER#usr_123#2025',
        GSI1SK: '2025-11-26T10:00:00.000Z',
        GSI3PK: 'USER#usr_123#NOTIF#READ',
        GSI3SK: '2025-11-26T10:00:00.000Z',
        entityType: 'NOTIFICATION',
        notificationId: 'notif_abc',
        type: 'GOOGLE_IMPORT',
        title: 'Import Complete',
        message: '10 events',
        status: 'READ',
        metadata: { imported: 10 },
        readAt: '2025-11-26T10:00:00.000Z',
        version: 2,
        createdAt: '2025-11-26T09:00:00.000Z',
        updatedAt: '2025-11-26T10:00:00.000Z',
        ttl: 12345678,
      };

      const notification = toNotification(record);

      // Should have notification fields
      expect(notification.notificationId).toBe('notif_abc');
      expect(notification.type).toBe('GOOGLE_IMPORT');
      expect(notification.title).toBe('Import Complete');
      expect(notification.message).toBe('10 events');
      expect(notification.status).toBe('READ');
      expect(notification.metadata).toEqual({ imported: 10 });
      expect(notification.readAt).toBe('2025-11-26T10:00:00.000Z');
      expect(notification.version).toBe(2);

      // Should NOT have DynamoDB keys
      expect((notification as any).PK).toBeUndefined();
      expect((notification as any).SK).toBeUndefined();
      expect((notification as any).GSI1PK).toBeUndefined();
      expect((notification as any).entityType).toBeUndefined();
      expect((notification as any).ttl).toBeUndefined();
    });
  });
});
