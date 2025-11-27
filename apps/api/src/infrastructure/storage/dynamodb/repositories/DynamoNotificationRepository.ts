/**
 * DynamoDB Notification Repository
 *
 * Implements NotificationRepository interface for DynamoDB storage.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import { injectable } from 'tsyringe';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client.js';
import type {
  NotificationRepository,
  Notification,
  CreateNotificationInput,
} from '../../../../domain/interfaces/NotificationRepository.js';
import { randomUUID } from 'crypto';

@injectable()
export class DynamoNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const notificationId = `notif_${randomUUID()}`;
    const now = new Date().toISOString();

    const item: Record<string, unknown> = {
      PK: `USER#${input.userId}`,
      SK: `NOTIFICATION#${notificationId}`,
      entityType: 'NOTIFICATION',
      notificationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
      readAt: null,
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return {
      notificationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
      readAt: null,
      createdAt: now,
    };
  }

  async findById(userId: string, notificationId: string): Promise<Notification | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${notificationId}`,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return {
      notificationId: result.Item.notificationId,
      userId: result.Item.userId,
      type: result.Item.type,
      title: result.Item.title,
      message: result.Item.message,
      metadata: result.Item.metadata,
      readAt: result.Item.readAt,
      createdAt: result.Item.createdAt,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const now = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `NOTIFICATION#${notificationId}`,
        },
        UpdateExpression: 'SET readAt = :now',
        ExpressionAttributeValues: {
          ':now': now,
        },
      })
    );
  }

  async delete(userId: string, notificationId: string): Promise<void> {
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
}
