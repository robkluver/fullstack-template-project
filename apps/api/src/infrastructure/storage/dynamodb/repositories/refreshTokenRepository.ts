/**
 * Refresh Token Repository - DynamoDB operations for token tracking
 *
 * Key patterns:
 * - PK: REFRESH#<jti>   SK: REFRESH
 * - GSI1PK: USER#<userId>   GSI1SK: REFRESH#<createdAt>
 * - TTL: expiresAt (auto-cleanup)
 *
 * @see docs/backend/DATABASE_SCHEMA.md
 * @see docs/core/AUTH_STRATEGY.md
 */

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME } from '../client.js';

export interface RefreshTokenRecord {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: 'REFRESH_TOKEN';
  jti: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
  ttl: number;
  revoked: boolean;
  revokedAt?: string;
}

/**
 * Store a new refresh token (for revocation tracking)
 */
export async function storeRefreshToken(params: {
  jti: string;
  userId: string;
  expiresAt: number;
}): Promise<void> {
  const now = new Date().toISOString();

  const record: RefreshTokenRecord = {
    PK: `REFRESH#${params.jti}`,
    SK: 'REFRESH',
    GSI1PK: `USER#${params.userId}`,
    GSI1SK: `REFRESH#${now}`,
    entityType: 'REFRESH_TOKEN',
    jti: params.jti,
    userId: params.userId,
    createdAt: now,
    expiresAt: params.expiresAt,
    ttl: params.expiresAt, // DynamoDB TTL (auto-delete after expiry)
    revoked: false,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: record,
    })
  );
}

/**
 * Find a refresh token by JTI
 */
export async function findRefreshToken(
  jti: string
): Promise<RefreshTokenRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `REFRESH#${jti}`,
        SK: 'REFRESH',
      },
    })
  );

  return result.Item as RefreshTokenRecord | null;
}

/**
 * Revoke a refresh token by JTI
 */
export async function revokeRefreshToken(jti: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `REFRESH#${jti}`,
        SK: 'REFRESH',
      },
    })
  );
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  // Query all refresh tokens for the user
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'REFRESH#',
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return;
  }

  // Delete all tokens (batch if needed)
  await Promise.all(
    result.Items.map((item) =>
      docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        })
      )
    )
  );
}

/**
 * Check if a refresh token is valid (exists and not revoked)
 */
export async function isRefreshTokenValid(jti: string): Promise<boolean> {
  const token = await findRefreshToken(jti);

  if (!token) {
    return false;
  }

  if (token.revoked) {
    return false;
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (token.expiresAt <= now) {
    return false;
  }

  return true;
}
