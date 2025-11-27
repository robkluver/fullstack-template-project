/**
 * Notification Repository - DynamoDB operations for Notification entities
 *
 * Key patterns:
 * - PK: USER#<userId>   SK: NOTIFICATION#<notificationId>
 * - GSI1PK: USER#<userId>#<YYYY>   GSI1SK: <createdAt> (chronological listing)
 * - GSI3PK: USER#<userId>#NOTIF#<status>   GSI3SK: <createdAt> (status filtering)
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 * @see docs/backend/DYNAMODB_CONVENTIONS.md
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME, GSI3_NAME } from '../client.js';
import type { Notification, NotificationType, NotificationStatus } from '@nexus/shared';
import { randomUUID } from 'crypto';

export interface NotificationRecord extends Notification {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI3PK: string;
  GSI3SK: string;
  entityType: 'NOTIFICATION';
  ttl?: number;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
  ttlDays?: number; // Default 30 days
}

/**
 * Create a new notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationRecord> {
  const notificationId = `notif_${randomUUID()}`;
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  // Calculate TTL (default 30 days)
  const ttlDays = input.ttlDays ?? 30;
  const ttl = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;

  const notification: NotificationRecord = {
    // DynamoDB keys
    PK: `USER#${input.userId}`,
    SK: `NOTIFICATION#${notificationId}`,
    GSI1PK: `USER#${input.userId}#${year}`,
    GSI1SK: now,
    GSI3PK: `USER#${input.userId}#NOTIF#UNREAD`,
    GSI3SK: now,
    entityType: 'NOTIFICATION',

    // Notification data
    notificationId,
    type: input.type,
    title: input.title,
    message: input.message,
    status: 'UNREAD',
    metadata: input.metadata,
    readAt: undefined,

    // Metadata
    version: 1,
    createdAt: now,
    updatedAt: now,
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: notification,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return notification;
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  userId: string,
  notificationId: string
): Promise<NotificationRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `NOTIFICATION#${notificationId}`,
      },
    })
  );

  return result.Item as NotificationRecord | null;
}

/**
 * List notifications for a user (chronological, most recent first)
 */
export async function listNotifications(
  userId: string,
  options: {
    limit?: number;
    year?: number;
  } = {}
): Promise<NotificationRecord[]> {
  const { limit = 20, year = new Date().getFullYear() } = options;

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#${year}`,
        ':type': 'NOTIFICATION',
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
  );

  return (result.Items || []) as NotificationRecord[];
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI3_NAME,
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#NOTIF#UNREAD`,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(
  userId: string,
  limit: number = 20
): Promise<NotificationRecord[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI3_NAME,
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#NOTIF#UNREAD`,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
  );

  return (result.Items || []) as NotificationRecord[];
}

/**
 * Update notification status (mark as read or dismissed)
 */
export async function updateNotificationStatus(
  userId: string,
  notificationId: string,
  newStatus: NotificationStatus,
  expectedVersion: number
): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  const readAt = newStatus === 'READ' ? now : undefined;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `NOTIFICATION#${notificationId}`,
      },
      UpdateExpression: `
        SET #status = :newStatus,
            GSI3PK = :newGsi3pk,
            readAt = :readAt,
            updatedAt = :now,
            version = version + :inc
      `,
      ConditionExpression: '#version = :expectedVersion',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#version': 'version',
      },
      ExpressionAttributeValues: {
        ':newStatus': newStatus,
        ':newGsi3pk': `USER#${userId}#NOTIF#${newStatus}`,
        ':readAt': readAt,
        ':now': now,
        ':inc': 1,
        ':expectedVersion': expectedVersion,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as NotificationRecord;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `NOTIFICATION#${notificationId}`,
      },
    })
  );
}

/**
 * Transform NotificationRecord to Notification (removes DynamoDB keys)
 */
export function toNotification(record: NotificationRecord): Notification {
  return {
    notificationId: record.notificationId,
    type: record.type,
    title: record.title,
    message: record.message,
    status: record.status,
    metadata: record.metadata,
    readAt: record.readAt,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
