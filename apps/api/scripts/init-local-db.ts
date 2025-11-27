#!/usr/bin/env npx ts-node
/**
 * Initialize Local DynamoDB Table
 *
 * Creates the ProductivityData table in DynamoDB Local for development.
 * Run this after starting docker-compose.
 *
 * Usage:
 *   npx ts-node scripts/init-local-db.ts
 *   # or
 *   yarn db:init
 *
 * @see docs/backend/DATABASE_SCHEMA.md Section 2
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'ProductivityData-dev';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

async function tableExists(): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

async function createTable(): Promise<void> {
  console.log(`Creating table: ${TABLE_NAME}`);

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'S' },
        { AttributeName: 'GSI2PK', AttributeType: 'S' },
        { AttributeName: 'GSI2SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1-YearView',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
        {
          IndexName: 'GSI2-RecurrenceLookup',
          KeySchema: [
            { AttributeName: 'GSI2PK', KeyType: 'HASH' },
            { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
      StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    })
  );

  console.log(`Table ${TABLE_NAME} created successfully!`);
  console.log('');
  console.log('Table structure:');
  console.log('  - PK (HASH) + SK (RANGE)');
  console.log('  - GSI1-YearView: GSI1PK + GSI1SK (calendar queries)');
  console.log('  - GSI2-RecurrenceLookup: GSI2PK + GSI2SK (sparse, recurring events)');
  console.log('  - Streams enabled (NEW_AND_OLD_IMAGES)');
}

async function main(): Promise<void> {
  console.log(`Connecting to DynamoDB at: ${ENDPOINT}`);
  console.log('');

  const exists = await tableExists();

  if (exists) {
    console.log(`Table ${TABLE_NAME} already exists. Skipping creation.`);
    return;
  }

  await createTable();
}

main().catch((error) => {
  console.error('Error initializing local database:', error);
  process.exit(1);
});
