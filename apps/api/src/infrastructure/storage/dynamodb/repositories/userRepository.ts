/**
 * User Repository - DynamoDB operations for User entities
 *
 * Key patterns:
 * - PK: USER#<userId>   SK: PROFILE
 * - GSI1PK: EMAIL#<email>   GSI1SK: USER
 *
 * @see docs/backend/DATABASE_SCHEMA.md
 * @see docs/core/AUTH_STRATEGY.md
 */

import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME, GSI1_NAME } from '../client.js';
import type { User } from '@nexus/shared';
import { randomUUID } from 'crypto';

export interface UserRecord extends User {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: 'USER';
  passwordHash: string;
  emailVerified: boolean;
  roles: string[];
  version: number;
}

/**
 * Find user by ID
 */
export async function findUserById(userId: string): Promise<UserRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    })
  );

  return result.Item as UserRecord | null;
}

/**
 * Find user by email (uses GSI1)
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.toLowerCase();

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_NAME,
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `EMAIL#${normalizedEmail}`,
        ':sk': 'USER',
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  return result.Items[0] as UserRecord;
}

/**
 * Create a new user
 */
export async function createUser(params: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<UserRecord> {
  const userId = `usr_${randomUUID()}`;
  const normalizedEmail = params.email.toLowerCase();
  const now = new Date().toISOString();

  const user: UserRecord = {
    // DynamoDB keys
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    GSI1PK: `EMAIL#${normalizedEmail}`,
    GSI1SK: 'USER',
    entityType: 'USER',

    // User data
    id: userId,
    email: normalizedEmail,
    name: params.name,
    passwordHash: params.passwordHash,
    emailVerified: false,
    roles: ['user'],

    // Metadata
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: user,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return user;
}

/**
 * Update user's password
 */
export async function updateUserPassword(
  userId: string,
  newPasswordHash: string,
  expectedVersion: number
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET #passwordHash = :hash, #updatedAt = :now, #version = #version + :inc',
      ConditionExpression: '#version = :expectedVersion',
      ExpressionAttributeNames: {
        '#passwordHash': 'passwordHash',
        '#updatedAt': 'updatedAt',
        '#version': 'version',
      },
      ExpressionAttributeValues: {
        ':hash': newPasswordHash,
        ':now': now,
        ':inc': 1,
        ':expectedVersion': expectedVersion,
      },
    })
  );
}

/**
 * Mark user email as verified
 */
export async function verifyUserEmail(userId: string): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET #emailVerified = :verified, #updatedAt = :now',
      ExpressionAttributeNames: {
        '#emailVerified': 'emailVerified',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':verified': true,
        ':now': now,
      },
    })
  );
}
