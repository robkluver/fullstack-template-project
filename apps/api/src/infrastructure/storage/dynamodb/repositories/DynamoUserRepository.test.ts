/**
 * DynamoDB User Repository Unit Tests
 *
 * Tests user metadata and OAuth token management.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoUserRepository } from './DynamoUserRepository.js';

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoUserRepository', () => {
  let repository: DynamoUserRepository;

  beforeEach(() => {
    ddbMock.reset();
    repository = new DynamoUserRepository();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findMeta', () => {
    it('should return user meta with OAuth tokens', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          userId: 'usr_123',
          googleOAuth: {
            accessToken: 'access_token_123',
            refreshToken: 'refresh_token_456',
            expiresAt: '2025-11-26T12:00:00.000Z',
            email: 'user@example.com',
            connectedAt: '2025-11-25T10:00:00.000Z',
          },
          googleCalendarSync: {
            lastSyncAt: '2025-11-26T09:00:00.000Z',
            syncToken: 'sync_token_abc',
          },
          updatedAt: '2025-11-26T09:00:00.000Z',
        },
      });

      const result = await repository.findMeta('usr_123');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('usr_123');
      expect(result?.googleOAuth).toEqual({
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresAt: '2025-11-26T12:00:00.000Z',
        email: 'user@example.com',
        connectedAt: '2025-11-25T10:00:00.000Z',
      });
      expect(result?.googleCalendarSync).toEqual({
        lastSyncAt: '2025-11-26T09:00:00.000Z',
        syncToken: 'sync_token_abc',
      });

      // Verify correct keys used
      const getCalls = ddbMock.commandCalls(GetCommand);
      expect(getCalls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'USER_META#usr_123',
      });
    });

    it('should return null if user meta not found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined,
      });

      const result = await repository.findMeta('usr_nonexistent');

      expect(result).toBeNull();
    });

    it('should use userId from parameter if not in item', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          // userId is missing from Item
          googleOAuth: {
            accessToken: 'token',
            refreshToken: null,
            expiresAt: '2025-11-26T12:00:00.000Z',
            email: 'user@example.com',
            connectedAt: '2025-11-25T10:00:00.000Z',
          },
          updatedAt: '2025-11-26T09:00:00.000Z',
        },
      });

      const result = await repository.findMeta('usr_123');

      expect(result?.userId).toBe('usr_123');
    });

    it('should project only needed fields', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          userId: 'usr_123',
          updatedAt: '2025-11-26T09:00:00.000Z',
        },
      });

      await repository.findMeta('usr_123');

      const getCalls = ddbMock.commandCalls(GetCommand);
      expect(getCalls[0].args[0].input.ProjectionExpression).toBe(
        'userId, googleOAuth, googleCalendarSync, updatedAt'
      );
    });

    it('should return user meta without OAuth if not connected', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          userId: 'usr_123',
          updatedAt: '2025-11-26T09:00:00.000Z',
          // No googleOAuth or googleCalendarSync
        },
      });

      const result = await repository.findMeta('usr_123');

      expect(result?.userId).toBe('usr_123');
      expect(result?.googleOAuth).toBeUndefined();
      expect(result?.googleCalendarSync).toBeUndefined();
    });
  });

  describe('saveGoogleOAuth', () => {
    it('should save OAuth tokens to USER_META', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      const tokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresAt: '2025-11-26T12:00:00.000Z',
        email: 'user@example.com',
        connectedAt: '2025-11-26T10:00:00.000Z',
      };

      await repository.saveGoogleOAuth('usr_123', tokens);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const input = updateCalls[0].args[0].input;
      expect(input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'USER_META#usr_123',
      });
      expect(input.ExpressionAttributeValues?.[':oauth']).toEqual(tokens);
    });

    it('should update timestamp', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.saveGoogleOAuth('usr_123', {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T12:00:00.000Z',
        email: 'user@example.com',
        connectedAt: '2025-11-26T10:00:00.000Z',
      });

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      const input = updateCalls[0].args[0].input;

      expect(input.ExpressionAttributeValues?.[':now']).toBe('2025-11-26T10:00:00.000Z');
      expect(input.UpdateExpression).toContain('updatedAt = :now');
    });

    it('should handle null refresh token', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      const tokens = {
        accessToken: 'access_token',
        refreshToken: null,
        expiresAt: '2025-11-26T12:00:00.000Z',
        email: 'user@example.com',
        connectedAt: '2025-11-26T10:00:00.000Z',
      };

      await repository.saveGoogleOAuth('usr_123', tokens);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls[0].args[0].input.ExpressionAttributeValues?.[':oauth'].refreshToken).toBeNull();
    });
  });

  describe('updateGoogleAccessToken', () => {
    it('should update nested accessToken field', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.updateGoogleAccessToken(
        'usr_123',
        'new_access_token',
        '2025-11-26T13:00:00.000Z'
      );

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const input = updateCalls[0].args[0].input;
      expect(input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'USER_META#usr_123',
      });
      expect(input.UpdateExpression).toBe(
        'SET googleOAuth.accessToken = :token, googleOAuth.expiresAt = :exp'
      );
      expect(input.ExpressionAttributeValues?.[':token']).toBe('new_access_token');
      expect(input.ExpressionAttributeValues?.[':exp']).toBe('2025-11-26T13:00:00.000Z');
    });
  });

  describe('updateGoogleCalendarSync', () => {
    it('should save sync token and lastSyncAt', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      const syncState = {
        lastSyncAt: '2025-11-26T10:00:00.000Z',
        syncToken: 'new_sync_token',
      };

      await repository.updateGoogleCalendarSync('usr_123', syncState);

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const input = updateCalls[0].args[0].input;
      expect(input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'USER_META#usr_123',
      });
      expect(input.ExpressionAttributeValues?.[':sync']).toEqual(syncState);
      expect(input.UpdateExpression).toContain('googleCalendarSync = :sync');
    });

    it('should update timestamp', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.updateGoogleCalendarSync('usr_123', {
        syncToken: 'token',
      });

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      const input = updateCalls[0].args[0].input;

      expect(input.ExpressionAttributeValues?.[':now']).toBe('2025-11-26T10:00:00.000Z');
    });

    it('should handle partial sync state', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.updateGoogleCalendarSync('usr_123', {
        syncToken: 'token_only',
        // No lastSyncAt
      });

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls[0].args[0].input.ExpressionAttributeValues?.[':sync']).toEqual({
        syncToken: 'token_only',
      });
    });
  });

  describe('removeGoogleOAuth', () => {
    it('should remove googleOAuth and googleCalendarSync', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.removeGoogleOAuth('usr_123');

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);

      const input = updateCalls[0].args[0].input;
      expect(input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'USER_META#usr_123',
      });
      expect(input.UpdateExpression).toContain('REMOVE googleOAuth, googleCalendarSync');
    });

    it('should update timestamp on removal', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await repository.removeGoogleOAuth('usr_123');

      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      const input = updateCalls[0].args[0].input;

      expect(input.UpdateExpression).toContain('SET updatedAt = :now');
      expect(input.ExpressionAttributeValues?.[':now']).toBe('2025-11-26T10:00:00.000Z');
    });
  });
});
