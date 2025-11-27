/**
 * GoogleCalendarService Unit Tests
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import {
  refreshAccessToken,
  getValidAccessToken,
  fetchGoogleCalendarEvents,
  mapGoogleEventToNexus,
  type GoogleCalendarEvent,
  type GoogleOAuthTokens,
} from './googleCalendarService.js';

// Mock the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

// Spy on axios methods
let axiosGetSpy: jest.SpiedFunction<typeof axios.get>;
let axiosPostSpy: jest.SpiedFunction<typeof axios.post>;

describe('GoogleCalendarService', () => {
  beforeEach(() => {
    ddbMock.reset();
    axiosGetSpy = jest.spyOn(axios, 'get');
    axiosPostSpy = jest.spyOn(axios, 'post');
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('refreshAccessToken', () => {
    it('should refresh token and update DynamoDB', async () => {
      const mockResponse = {
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      axiosPostSpy.mockResolvedValueOnce(mockResponse);
      ddbMock.on(UpdateCommand).resolves({});

      const result = await refreshAccessToken('usr_123', 'refresh_token_abc');

      expect(result.accessToken).toBe('new_access_token');
      expect(result.expiresAt).toBe('2025-11-26T11:00:00.000Z'); // 1 hour from now

      // Verify DynamoDB was updated
      const updateCalls = ddbMock.commandCalls(UpdateCommand);
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].args[0].input.Key).toEqual({
        PK: 'USER#usr_123',
        SK: 'USER_META#usr_123',
      });
    });

    it('should throw on refresh failure', async () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: 'Invalid refresh token',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      axiosPostSpy.mockRejectedValueOnce(axiosError);

      await expect(refreshAccessToken('usr_123', 'invalid_token')).rejects.toThrow('TOKEN_REFRESH_FAILED');
    });
  });

  describe('getValidAccessToken', () => {
    it('should return current token if not expired', async () => {
      const tokens: GoogleOAuthTokens = {
        accessToken: 'valid_access_token',
        refreshToken: 'refresh_token',
        expiresAt: '2025-11-26T12:00:00.000Z', // 2 hours from now
        email: 'user@example.com',
        connectedAt: '2025-11-26T08:00:00.000Z',
      };

      const result = await getValidAccessToken('usr_123', tokens);

      expect(result).toBe('valid_access_token');
      // Should not call axios for refresh
      expect(axiosPostSpy).not.toHaveBeenCalled();
    });

    it('should refresh token if expired', async () => {
      const tokens: GoogleOAuthTokens = {
        accessToken: 'expired_access_token',
        refreshToken: 'refresh_token',
        expiresAt: '2025-11-26T10:03:00.000Z', // 3 minutes from now (within 5 min buffer)
        email: 'user@example.com',
        connectedAt: '2025-11-26T08:00:00.000Z',
      };

      axiosPostSpy.mockResolvedValueOnce({
        data: { access_token: 'new_token', expires_in: 3600 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      ddbMock.on(UpdateCommand).resolves({});

      const result = await getValidAccessToken('usr_123', tokens);

      expect(result).toBe('new_token');
      expect(axiosPostSpy).toHaveBeenCalled();
    });

    it('should throw if expired without refresh token', async () => {
      const tokens: GoogleOAuthTokens = {
        accessToken: 'expired_access_token',
        refreshToken: null,
        expiresAt: '2025-11-26T09:00:00.000Z', // 1 hour ago
        email: 'user@example.com',
        connectedAt: '2025-11-26T08:00:00.000Z',
      };

      await expect(getValidAccessToken('usr_123', tokens)).rejects.toThrow('TOKEN_EXPIRED_NO_REFRESH');
    });
  });

  describe('fetchGoogleCalendarEvents', () => {
    it('should fetch events with full sync', async () => {
      const mockEvents = [
        { id: 'evt1', summary: 'Meeting', status: 'confirmed' },
        { id: 'evt2', summary: 'Lunch', status: 'confirmed' },
      ];

      axiosGetSpy.mockResolvedValueOnce({
        data: {
          kind: 'calendar#events',
          items: mockEvents,
          nextSyncToken: 'sync_token_123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      const result = await fetchGoogleCalendarEvents('access_token');

      expect(result.events).toHaveLength(2);
      expect(result.nextSyncToken).toBe('sync_token_123');

      // Verify URL parameters for full sync
      const callArgs = axiosGetSpy.mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain('timeMin=');
      expect(url).toContain('timeMax=');
      expect(url).toContain('singleEvents=false');
    });

    it('should fetch events with incremental sync', async () => {
      axiosGetSpy.mockResolvedValueOnce({
        data: {
          kind: 'calendar#events',
          items: [{ id: 'evt3', summary: 'Updated' }],
          nextSyncToken: 'new_sync_token',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      const result = await fetchGoogleCalendarEvents('access_token', {
        syncToken: 'old_sync_token',
      });

      expect(result.events).toHaveLength(1);
      expect(result.nextSyncToken).toBe('new_sync_token');

      // Verify URL parameters for incremental sync
      const callArgs = axiosGetSpy.mock.calls[0];
      const url = callArgs[0] as string;
      expect(url).toContain('syncToken=old_sync_token');
      expect(url).not.toContain('timeMin=');
    });

    it('should throw SYNC_TOKEN_INVALID on 410 response', async () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 410,
        statusText: 'Gone',
        data: 'Sync token invalid',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      axiosGetSpy.mockRejectedValueOnce(axiosError);

      await expect(
        fetchGoogleCalendarEvents('access_token', { syncToken: 'invalid_token' })
      ).rejects.toThrow('SYNC_TOKEN_INVALID');
    });

    it('should throw GOOGLE_API_ERROR on other errors', async () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      axiosGetSpy.mockRejectedValueOnce(axiosError);

      await expect(fetchGoogleCalendarEvents('bad_token')).rejects.toThrow('GOOGLE_API_ERROR');
    });

    it('should handle pagination', async () => {
      // First page
      axiosGetSpy.mockResolvedValueOnce({
        data: {
          kind: 'calendar#events',
          items: [{ id: 'evt1' }],
          nextPageToken: 'page2',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      // Second page
      axiosGetSpy.mockResolvedValueOnce({
        data: {
          kind: 'calendar#events',
          items: [{ id: 'evt2' }],
          nextSyncToken: 'final_sync_token',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      const result = await fetchGoogleCalendarEvents('access_token');

      expect(result.events).toHaveLength(2);
      expect(axiosGetSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('mapGoogleEventToNexus', () => {
    it('should map a timed event', () => {
      const googleEvent: GoogleCalendarEvent = {
        id: 'google_evt_123',
        etag: '"etag_value"',
        status: 'confirmed',
        summary: 'Team Meeting',
        description: 'Weekly standup',
        location: 'Conference Room A',
        start: {
          dateTime: '2025-11-26T14:00:00-05:00',
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: '2025-11-26T15:00:00-05:00',
          timeZone: 'America/New_York',
        },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const nexusEvent = mapGoogleEventToNexus(googleEvent);

      expect(nexusEvent.title).toBe('Team Meeting');
      expect(nexusEvent.description).toBe('Weekly standup');
      expect(nexusEvent.location).toBe('Conference Room A');
      expect(nexusEvent.startUtc).toBe('2025-11-26T14:00:00-05:00');
      expect(nexusEvent.endUtc).toBe('2025-11-26T15:00:00-05:00');
      expect(nexusEvent.startTzid).toBe('America/New_York');
      expect(nexusEvent.isAllDay).toBe(false);
      expect(nexusEvent.status).toBe('CONFIRMED');
      expect(nexusEvent.googleEventId).toBe('google_evt_123');
      expect(nexusEvent.googleEtag).toBe('"etag_value"');
    });

    it('should map an all-day event', () => {
      const googleEvent: GoogleCalendarEvent = {
        id: 'allday_evt',
        etag: '"etag2"',
        status: 'confirmed',
        summary: 'Holiday',
        start: {
          date: '2025-12-25',
        },
        end: {
          date: '2025-12-26',
        },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const nexusEvent = mapGoogleEventToNexus(googleEvent);

      expect(nexusEvent.isAllDay).toBe(true);
      expect(nexusEvent.startUtc).toBe('2025-12-25T00:00:00Z');
      expect(nexusEvent.endUtc).toBe('2025-12-26T00:00:00Z');
      expect(nexusEvent.startTzid).toBeNull();
    });

    it('should map status correctly', () => {
      const tentativeEvent: GoogleCalendarEvent = {
        id: 'tentative_evt',
        etag: '"e"',
        status: 'tentative',
        start: { dateTime: '2025-11-26T10:00:00Z' },
        end: { dateTime: '2025-11-26T11:00:00Z' },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const cancelledEvent: GoogleCalendarEvent = {
        id: 'cancelled_evt',
        etag: '"c"',
        status: 'cancelled',
        start: { dateTime: '2025-11-26T10:00:00Z' },
        end: { dateTime: '2025-11-26T11:00:00Z' },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      expect(mapGoogleEventToNexus(tentativeEvent).status).toBe('TENTATIVE');
      expect(mapGoogleEventToNexus(cancelledEvent).status).toBe('CANCELLED');
    });

    it('should handle events without title', () => {
      const noTitleEvent: GoogleCalendarEvent = {
        id: 'notitle_evt',
        etag: '"n"',
        status: 'confirmed',
        start: { dateTime: '2025-11-26T10:00:00Z' },
        end: { dateTime: '2025-11-26T11:00:00Z' },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const nexusEvent = mapGoogleEventToNexus(noTitleEvent);
      expect(nexusEvent.title).toBe('(No title)');
    });

    it('should map recurring events with RRULE', () => {
      const recurringEvent: GoogleCalendarEvent = {
        id: 'recurring_evt',
        etag: '"r"',
        status: 'confirmed',
        summary: 'Weekly Standup',
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
        start: { dateTime: '2025-11-26T09:00:00Z' },
        end: { dateTime: '2025-11-26T09:30:00Z' },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const nexusEvent = mapGoogleEventToNexus(recurringEvent);
      expect(nexusEvent.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
    });

    it('should map recurring event instance/exception', () => {
      const instanceEvent: GoogleCalendarEvent = {
        id: 'instance_evt',
        etag: '"i"',
        status: 'confirmed',
        summary: 'Weekly Standup (Modified)',
        recurringEventId: 'master_recurring_evt',
        originalStartTime: {
          dateTime: '2025-11-26T09:00:00Z',
        },
        start: { dateTime: '2025-11-26T10:00:00Z' }, // Modified time
        end: { dateTime: '2025-11-26T10:30:00Z' },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const nexusEvent = mapGoogleEventToNexus(instanceEvent);
      expect(nexusEvent.masterEventId).toBe('master_recurring_evt');
      expect(nexusEvent.originalStartUtc).toBe('2025-11-26T09:00:00Z');
    });

    it('should use custom calendar ID', () => {
      const event: GoogleCalendarEvent = {
        id: 'evt',
        etag: '"e"',
        status: 'confirmed',
        start: { dateTime: '2025-11-26T10:00:00Z' },
        end: { dateTime: '2025-11-26T11:00:00Z' },
        created: '2025-11-20T10:00:00Z',
        updated: '2025-11-25T10:00:00Z',
      };

      const nexusEvent = mapGoogleEventToNexus(event, 'work@example.com');
      expect(nexusEvent.googleCalendarId).toBe('work@example.com');
    });
  });
});
