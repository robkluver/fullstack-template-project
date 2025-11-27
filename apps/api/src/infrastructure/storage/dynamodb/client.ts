/**
 * DynamoDB Client Configuration
 *
 * Centralized DynamoDB client with DocumentClient for type-safe operations.
 * Supports local development with DynamoDB Local.
 *
 * @see docs/backend/dynamodb-spec/02-TABLE-CONFIG-AND-INDEXES.md
 * @see docs/backend/DYNAMODB_CONVENTIONS.md
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.IS_OFFLINE === 'true' || process.env.IS_LOCAL === 'true';

/**
 * Raw DynamoDB client (for low-level operations)
 */
export const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(isLocal && {
    endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  }),
});

/**
 * DocumentClient for type-safe operations with native JavaScript types
 *
 * Configuration:
 * - removeUndefinedValues: Prevents errors when optional fields are undefined
 * - convertClassInstanceToMap: Allows using class instances directly
 */
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Table name from environment (set by serverless.yml)
 */
export const TABLE_NAME = process.env.TABLE_NAME || 'ProductivityData-dev';

/**
 * GSI Index Names
 * @see docs/backend/dynamodb-spec/02-TABLE-CONFIG-AND-INDEXES.md
 */
export const GSI1_NAME = 'GSI1-YearView';       // Calendar/agenda queries
export const GSI2_NAME = 'GSI2-RecurrenceLookup'; // Recurring event series
export const GSI3_NAME = 'GSI3-TaskStatus';     // Kanban board views (Phase 2)
export const GSI4_NAME = 'GSI4-CrossLinks';     // Reverse link lookups (Phase 5)
