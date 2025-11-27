/**
 * Google Calendar HTTP Adapter Unit Tests
 *
 * Tests HTTP calls to Google APIs with axios mocking.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import axios, { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { GoogleCalendarAdapter } from './GoogleCalendarAdapter.js';
import {
  TokenRefreshError,
  SyncTokenInvalidError,
  GoogleApiError,
} from '../../lib/errors.js';

describe('GoogleCalendarAdapter', () => {
  let adapter: GoogleCalendarAdapter;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let axiosPostSpy: jest.SpiedFunction<typeof axios.post>;
  let axiosGetSpy: jest.SpiedFunction<typeof axios.get>;

  beforeEach(() => {
    adapter = new GoogleCalendarAdapter();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    axiosPostSpy = jest.spyOn(axios, 'post');
    axiosGetSpy = jest.spyOn(axios, 'get');
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    axiosPostSpy.mockRestore();
    axiosGetSpy.mockRestore();
  });

  function createAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }

  function createAxiosError(status: number, data?: unknown): AxiosError {
    const error = new Error('Request failed') as AxiosError;
    error.isAxiosError = true;
    error.response = {
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    };
    return error;
  }

  describe('refreshAccessToken', () => {
    it('should refresh token and return new credentials', async () => {
      axiosPostSpy.mockResolvedValue(
        createAxiosResponse({
          access_token: 'new_access_token',
          expires_in: 3600,
        })
      );

      const result = await adapter.refreshAccessToken('refresh_token_123');

      expect(result.accessToken).toBe('new_access_token');
      expect(result.expiresAt).toBe('2025-11-26T11:00:00.000Z'); // 1 hour later

      expect(axiosPostSpy).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should throw TokenRefreshError on failure', async () => {
      axiosPostSpy.mockRejectedValue(createAxiosError(400, { error: 'invalid_grant' }));

      await expect(adapter.refreshAccessToken('bad_token')).rejects.toThrow(TokenRefreshError);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should calculate correct expiration time', async () => {
      axiosPostSpy.mockResolvedValue(
        createAxiosResponse({
          access_token: 'token',
          expires_in: 7200, // 2 hours
        })
      );

      const result = await adapter.refreshAccessToken('refresh_token');

      expect(result.expiresAt).toBe('2025-11-26T12:00:00.000Z'); // 2 hours later
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code and return tokens', async () => {
      axiosPostSpy.mockResolvedValue(
        createAxiosResponse({
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_456',
          expires_in: 3600,
        })
      );

      const result = await adapter.exchangeCodeForTokens(
        'auth_code',
        'https://example.com/callback'
      );

      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_456');
      expect(result.expiresAt).toBe('2025-11-26T11:00:00.000Z');
    });

    it('should return null refreshToken when not provided', async () => {
      axiosPostSpy.mockResolvedValue(
        createAxiosResponse({
          access_token: 'access_token',
          expires_in: 3600,
          // No refresh_token
        })
      );

      const result = await adapter.exchangeCodeForTokens(
        'code',
        'https://example.com/callback'
      );

      expect(result.refreshToken).toBeNull();
    });

    it('should throw GoogleApiError on failure', async () => {
      axiosPostSpy.mockRejectedValue(createAxiosError(400, { error: 'invalid_code' }));

      await expect(
        adapter.exchangeCodeForTokens('bad_code', 'https://example.com/callback')
      ).rejects.toThrow(GoogleApiError);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include correct parameters in request', async () => {
      axiosPostSpy.mockResolvedValue(
        createAxiosResponse({
          access_token: 'token',
          expires_in: 3600,
        })
      );

      await adapter.exchangeCodeForTokens('auth_code', 'https://app.example.com/oauth/callback');

      const [, params] = axiosPostSpy.mock.calls[0];
      expect(params).toBeInstanceOf(URLSearchParams);
      expect((params as URLSearchParams).get('code')).toBe('auth_code');
      expect((params as URLSearchParams).get('redirect_uri')).toBe('https://app.example.com/oauth/callback');
      expect((params as URLSearchParams).get('grant_type')).toBe('authorization_code');
    });
  });

  describe('getUserInfo', () => {
    it('should return user info', async () => {
      axiosGetSpy.mockResolvedValue(
        createAxiosResponse({
          email: 'user@example.com',
          verified_email: true,
        })
      );

      const result = await adapter.getUserInfo('access_token');

      expect(result.email).toBe('user@example.com');
      expect(result.verified_email).toBe(true);

      expect(axiosGetSpy).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer access_token' },
        })
      );
    });

    it('should throw GoogleApiError on failure', async () => {
      axiosGetSpy.mockRejectedValue(createAxiosError(401, { error: 'unauthorized' }));

      await expect(adapter.getUserInfo('invalid_token')).rejects.toThrow(GoogleApiError);
    });
  });

  describe('fetchEvents', () => {
    it('should fetch events with syncToken', async () => {
      axiosGetSpy.mockResolvedValue(
        createAxiosResponse({
          items: [{ id: 'event1', summary: 'Test Event' }],
          nextSyncToken: 'new_sync_token',
        })
      );

      const result = await adapter.fetchEvents('access_token', {
        syncToken: 'existing_sync_token',
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe('event1');
      expect(result.nextSyncToken).toBe('new_sync_token');

      const [url] = axiosGetSpy.mock.calls[0];
      expect(url).toContain('syncToken=existing_sync_token');
    });

    it('should fetch events without syncToken (full sync)', async () => {
      axiosGetSpy.mockResolvedValue(
        createAxiosResponse({
          items: [{ id: 'event1' }, { id: 'event2' }],
          nextSyncToken: 'sync_token',
        })
      );

      const result = await adapter.fetchEvents('access_token');

      expect(result.events).toHaveLength(2);

      const [url] = axiosGetSpy.mock.calls[0];
      expect(url).toContain('timeMin=');
      expect(url).toContain('timeMax=');
      expect(url).not.toContain('syncToken=');
    });

    it('should handle pagination', async () => {
      axiosGetSpy
        .mockResolvedValueOnce(
          createAxiosResponse({
            items: [{ id: 'event1' }],
            nextPageToken: 'page2_token',
          })
        )
        .mockResolvedValueOnce(
          createAxiosResponse({
            items: [{ id: 'event2' }],
            nextSyncToken: 'final_sync_token',
          })
        );

      const result = await adapter.fetchEvents('access_token');

      expect(result.events).toHaveLength(2);
      expect(result.nextSyncToken).toBe('final_sync_token');
      expect(axiosGetSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw SyncTokenInvalidError on 410 response', async () => {
      axiosGetSpy.mockRejectedValue(createAxiosError(410, { error: 'fullSyncRequired' }));

      await expect(
        adapter.fetchEvents('access_token', { syncToken: 'old_token' })
      ).rejects.toThrow(SyncTokenInvalidError);
    });

    it('should throw GoogleApiError on other errors', async () => {
      axiosGetSpy.mockRejectedValue(createAxiosError(500, { error: 'internal' }));

      await expect(adapter.fetchEvents('access_token')).rejects.toThrow(GoogleApiError);
    });

    it('should handle empty items array', async () => {
      axiosGetSpy.mockResolvedValue(
        createAxiosResponse({
          items: [],
          nextSyncToken: 'sync_token',
        })
      );

      const result = await adapter.fetchEvents('access_token');

      expect(result.events).toHaveLength(0);
    });

    it('should handle undefined items', async () => {
      axiosGetSpy.mockResolvedValue(
        createAxiosResponse({
          nextSyncToken: 'sync_token',
          // No items array
        })
      );

      const result = await adapter.fetchEvents('access_token');

      expect(result.events).toHaveLength(0);
    });
  });

  describe('revokeToken', () => {
    it('should call revoke endpoint', async () => {
      axiosPostSpy.mockResolvedValue(createAxiosResponse(null));

      await adapter.revokeToken('access_token_to_revoke');

      expect(axiosPostSpy).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke?token=access_token_to_revoke',
        null,
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should not throw on revocation failure', async () => {
      axiosPostSpy.mockRejectedValue(createAxiosError(400, { error: 'invalid_token' }));

      // Should not throw
      await adapter.revokeToken('invalid_token');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to revoke token at Google:',
        expect.anything()
      );
    });
  });
});
