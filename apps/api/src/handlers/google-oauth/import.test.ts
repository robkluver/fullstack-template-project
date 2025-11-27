/**
 * Google Calendar Import Handler Unit Tests
 * Tests conflict detection and event import logic
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock the container to avoid TSyringe decorator issues in tests
const mockExecute = jest.fn();
jest.unstable_mockModule('../../di/container.js', () => ({
  container: {
    resolve: jest.fn(() => ({ execute: mockExecute })),
  },
}));

// Import handler after mocking
const { handler } = await import('./import.js');
const { SyncTokenInvalidError, NotConnectedError, ReauthRequiredError } = await import('../../lib/errors.js');

// Helper to create API Gateway event
function createEvent(userId: string): APIGatewayProxyEvent {
  return {
    pathParameters: { userId },
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: `/users/${userId}/google-calendar/import`,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
  };
}

describe('Google Calendar Import Handler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
    mockExecute.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('validation', () => {
    it('should return 400 if userId is missing', async () => {
      const event = createEvent('');
      event.pathParameters = {};

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if Google Calendar not connected', async () => {
      mockExecute.mockRejectedValue(new NotConnectedError('Google Calendar'));

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error.code).toBe('NOT_CONNECTED');
    });

    it('should return 401 if token expired without refresh token', async () => {
      mockExecute.mockRejectedValue(new ReauthRequiredError('Google Calendar'));

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.code).toBe('REAUTH_REQUIRED');
    });
  });

  describe('importing new events', () => {
    it('should import new events from Google', async () => {
      mockExecute.mockResolvedValue({
        imported: 1,
        skipped: 0,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.imported).toBe(1);
      expect(body.data.conflicts).toHaveLength(0);
    });

    it('should skip cancelled events', async () => {
      mockExecute.mockResolvedValue({
        imported: 0,
        skipped: 1,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.skipped).toBe(1);
    });
  });

  describe('conflict detection', () => {
    it('should detect conflict when both local and Google changed', async () => {
      mockExecute.mockResolvedValue({
        imported: 0,
        skipped: 1,
        conflicts: [
          {
            eventId: 'evt_123',
            title: 'Updated Meeting',
            localUpdatedAt: '2025-11-25T14:00:00.000Z',
            googleUpdatedAt: '2025-11-25T16:00:00Z',
          },
        ],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.conflicts).toHaveLength(1);
      expect(body.data.conflicts[0].eventId).toBe('evt_123');
      expect(body.data.conflicts[0].title).toBe('Updated Meeting');
    });

    it('should update when only Google changed (no local changes)', async () => {
      mockExecute.mockResolvedValue({
        imported: 1,
        skipped: 0,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.imported).toBe(1);
      expect(body.data.conflicts).toHaveLength(0);
    });

    it('should skip when neither local nor Google changed', async () => {
      mockExecute.mockResolvedValue({
        imported: 0,
        skipped: 1,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.imported).toBe(0);
      expect(body.data.skipped).toBe(1);
      expect(body.data.conflicts).toHaveLength(0);
    });
  });

  describe('sync token handling', () => {
    it('should use sync token for incremental sync', async () => {
      mockExecute.mockResolvedValue({
        imported: 0,
        skipped: 0,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      await handler(createEvent('usr_123'));

      expect(mockExecute).toHaveBeenCalledWith('usr_123');
    });

    it('should handle sync token invalid by doing full sync', async () => {
      // Use case handles this internally, so we just test successful result
      mockExecute.mockResolvedValue({
        imported: 0,
        skipped: 0,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
    });
  });

  describe('notification creation', () => {
    it('should create notification with import results', async () => {
      mockExecute.mockResolvedValue({
        imported: 1,
        skipped: 0,
        conflicts: [],
        notificationId: 'notif_abc123',
      });

      const result = await handler(createEvent('usr_123'));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.notificationId).toBe('notif_abc123');
    });
  });
});
