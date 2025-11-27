/**
 * Connect Google Calendar Use Case Unit Tests
 *
 * Tests OAuth callback flow for connecting Google Calendar.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConnectGoogleCalendar } from './ConnectGoogleCalendar.js';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import type { GoogleCalendarServicePort } from '../../domain/interfaces/GoogleCalendarService.js';
import { ValidationError } from '../../lib/errors.js';

describe('ConnectGoogleCalendar', () => {
  let useCase: ConnectGoogleCalendar;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockGoogleService: jest.Mocked<GoogleCalendarServicePort>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    // Create mocks
    mockUserRepo = {
      findMeta: jest.fn(),
      saveGoogleOAuth: jest.fn(),
      updateGoogleAccessToken: jest.fn(),
      updateGoogleCalendarSync: jest.fn(),
      removeGoogleOAuth: jest.fn(),
    } as jest.Mocked<UserRepository>;

    mockGoogleService = {
      exchangeCodeForTokens: jest.fn(),
      getUserInfo: jest.fn(),
      refreshAccessToken: jest.fn(),
      fetchEvents: jest.fn(),
      revokeToken: jest.fn(),
    } as jest.Mocked<GoogleCalendarServicePort>;

    useCase = new ConnectGoogleCalendar(mockUserRepo, mockGoogleService);

    // Mock console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Use fake timers
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleWarnSpy.mockRestore();
  });

  /**
   * Helper to encode state as the use case expects
   */
  function encodeState(userId: string, nonce?: string): string {
    const stateData = nonce ? `${userId}:${nonce}` : userId;
    return Buffer.from(stateData).toString('base64url');
  }

  describe('execute', () => {
    it('should successfully connect Google Calendar with all tokens', async () => {
      const userId = 'usr_123';
      const code = 'auth_code_abc';
      const state = encodeState(userId, 'nonce123');
      const redirectUri = 'https://app.example.com/callback';

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'user@example.com',
        verified_email: true,
      });

      mockUserRepo.saveGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute({ code, state, redirectUri });

      expect(result).toEqual({
        connected: true,
        email: 'user@example.com',
        connectedAt: '2025-11-26T10:00:00.000Z',
      });

      expect(mockGoogleService.exchangeCodeForTokens).toHaveBeenCalledWith(code, redirectUri);
      expect(mockGoogleService.getUserInfo).toHaveBeenCalledWith('access_token_123');
      expect(mockUserRepo.saveGoogleOAuth).toHaveBeenCalledWith(userId, {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresAt: '2025-11-26T11:00:00.000Z',
        email: 'user@example.com',
        connectedAt: '2025-11-26T10:00:00.000Z',
      });
    });

    it('should handle state without nonce', async () => {
      const userId = 'usr_456';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'test@example.com',
        verified_email: true,
      });

      const result = await useCase.execute({
        code: 'code',
        state,
        redirectUri: 'https://example.com/cb',
      });

      expect(result.connected).toBe(true);
      expect(mockUserRepo.saveGoogleOAuth).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    it('should warn when no refresh token is received', async () => {
      const userId = 'usr_789';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'access_token',
        refreshToken: null, // No refresh token
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'user@test.com',
        verified_email: true,
      });

      await useCase.execute({
        code: 'code',
        state,
        redirectUri: 'https://example.com/cb',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No refresh token received - user may need to revoke and reconnect'
      );
    });

    it('should save null refresh token when not provided', async () => {
      const userId = 'usr_789';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'access_token',
        refreshToken: null,
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'user@test.com',
        verified_email: true,
      });

      await useCase.execute({
        code: 'code',
        state,
        redirectUri: 'https://example.com/cb',
      });

      expect(mockUserRepo.saveGoogleOAuth).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ refreshToken: null })
      );
    });

    it('should throw ValidationError for state with empty userId', async () => {
      // State that decodes to a string starting with colon (empty userId part)
      const invalidState = Buffer.from(':some-nonce').toString('base64url');

      await expect(
        useCase.execute({
          code: 'code',
          state: invalidState,
          redirectUri: 'https://example.com/cb',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty state after decode', async () => {
      // Empty string encoded in base64url
      const emptyState = Buffer.from('').toString('base64url');

      await expect(
        useCase.execute({
          code: 'code',
          state: emptyState,
          redirectUri: 'https://example.com/cb',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should propagate errors from token exchange', async () => {
      const userId = 'usr_123';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Token exchange failed')
      );

      await expect(
        useCase.execute({
          code: 'invalid_code',
          state,
          redirectUri: 'https://example.com/cb',
        })
      ).rejects.toThrow('Token exchange failed');

      expect(mockGoogleService.getUserInfo).not.toHaveBeenCalled();
      expect(mockUserRepo.saveGoogleOAuth).not.toHaveBeenCalled();
    });

    it('should propagate errors from getUserInfo', async () => {
      const userId = 'usr_123';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockRejectedValue(
        new Error('Failed to get user info')
      );

      await expect(
        useCase.execute({
          code: 'code',
          state,
          redirectUri: 'https://example.com/cb',
        })
      ).rejects.toThrow('Failed to get user info');

      expect(mockUserRepo.saveGoogleOAuth).not.toHaveBeenCalled();
    });

    it('should propagate errors from saveGoogleOAuth', async () => {
      const userId = 'usr_123';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'user@test.com',
        verified_email: true,
      });

      mockUserRepo.saveGoogleOAuth.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        useCase.execute({
          code: 'code',
          state,
          redirectUri: 'https://example.com/cb',
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle special characters in state properly', async () => {
      // State with colon separator and complex nonce
      const userId = 'usr_special';
      const nonce = 'abc:def:123';
      const state = encodeState(userId, nonce);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'special@test.com',
        verified_email: true,
      });

      const result = await useCase.execute({
        code: 'code',
        state,
        redirectUri: 'https://example.com/cb',
      });

      // Should extract only the userId part (before first colon)
      expect(mockUserRepo.saveGoogleOAuth).toHaveBeenCalledWith(
        userId,
        expect.anything()
      );
      expect(result.connected).toBe(true);
    });
  });

  describe('state decoding', () => {
    it('should extract userId from state with nonce', async () => {
      const userId = 'usr_test';
      const state = encodeState(userId, 'random-nonce');

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'user@test.com',
        verified_email: true,
      });

      await useCase.execute({
        code: 'code',
        state,
        redirectUri: 'https://example.com/cb',
      });

      expect(mockUserRepo.saveGoogleOAuth).toHaveBeenCalledWith(
        userId,
        expect.anything()
      );
    });

    it('should handle state that decodes to just userId', async () => {
      const userId = 'simple_user_id';
      const state = encodeState(userId);

      mockGoogleService.exchangeCodeForTokens.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });

      mockGoogleService.getUserInfo.mockResolvedValue({
        email: 'user@test.com',
        verified_email: true,
      });

      await useCase.execute({
        code: 'code',
        state,
        redirectUri: 'https://example.com/cb',
      });

      expect(mockUserRepo.saveGoogleOAuth).toHaveBeenCalledWith(
        userId,
        expect.anything()
      );
    });
  });
});
