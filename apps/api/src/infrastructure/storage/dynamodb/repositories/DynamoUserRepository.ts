/**
 * DynamoDB User Repository
 *
 * Implements UserRepository interface for DynamoDB storage.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import { injectable } from 'tsyringe';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../client.js';
import type {
  UserRepository,
  UserMeta,
} from '../../../../domain/interfaces/UserRepository.js';
import type {
  GoogleOAuthTokens,
  GoogleCalendarSyncState,
} from '../../../../domain/entities/GoogleOAuth.js';

@injectable()
export class DynamoUserRepository implements UserRepository {
  async findMeta(userId: string): Promise<UserMeta | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
        ProjectionExpression: 'userId, googleOAuth, googleCalendarSync, updatedAt',
      })
    );

    if (!result.Item) {
      return null;
    }

    return {
      userId: result.Item.userId || userId,
      googleOAuth: result.Item.googleOAuth,
      googleCalendarSync: result.Item.googleCalendarSync,
      updatedAt: result.Item.updatedAt,
    };
  }

  async saveGoogleOAuth(userId: string, tokens: GoogleOAuthTokens): Promise<void> {
    const now = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
        UpdateExpression: `
          SET googleOAuth = :oauth,
              updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':oauth': tokens,
          ':now': now,
        },
      })
    );
  }

  async updateGoogleAccessToken(
    userId: string,
    accessToken: string,
    expiresAt: string
  ): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
        UpdateExpression: 'SET googleOAuth.accessToken = :token, googleOAuth.expiresAt = :exp',
        ExpressionAttributeValues: {
          ':token': accessToken,
          ':exp': expiresAt,
        },
      })
    );
  }

  async updateGoogleCalendarSync(
    userId: string,
    syncState: GoogleCalendarSyncState
  ): Promise<void> {
    const now = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
        UpdateExpression: `
          SET googleCalendarSync = :sync,
              updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':sync': syncState,
          ':now': now,
        },
      })
    );
  }

  async removeGoogleOAuth(userId: string): Promise<void> {
    const now = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `USER_META#${userId}`,
        },
        UpdateExpression: `
          REMOVE googleOAuth, googleCalendarSync
          SET updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':now': now,
        },
      })
    );
  }
}
