/**
 * Disconnect Google Calendar Use Case Unit Tests
 *
 * Tests disconnection flow including token revocation.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DisconnectGoogleCalendar } from './DisconnectGoogleCalendar.js';
import type { UserRepository, UserMeta } from '../../domain/interfaces/UserRepository.js';
import type { GoogleCalendarServicePort } from '../../domain/interfaces/GoogleCalendarService.js';
import { NotConnectedError } from '../../lib/errors.js';

describe('DisconnectGoogleCalendar', () => {
  let useCase: DisconnectGoogleCalendar;
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

    useCase = new DisconnectGoogleCalendar(mockUserRepo, mockGoogleService);

    // Mock console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('execute', () => {
    it('should successfully disconnect Google Calendar', async () => {
      const userId = 'usr_123';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockGoogleService.revokeToken.mockResolvedValue(undefined);
      mockUserRepo.removeGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ disconnected: true });
      expect(mockUserRepo.findMeta).toHaveBeenCalledWith(userId);
      expect(mockGoogleService.revokeToken).toHaveBeenCalledWith('access_token_123');
      expect(mockUserRepo.removeGoogleOAuth).toHaveBeenCalledWith(userId);
    });

    it('should throw NotConnectedError if user has no googleOAuth', async () => {
      const userId = 'usr_456';
      const userMeta: UserMeta = {
        userId,
        // No googleOAuth
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);

      await expect(useCase.execute(userId)).rejects.toThrow(NotConnectedError);
      await expect(useCase.execute(userId)).rejects.toThrow('Google Calendar is not connected');

      expect(mockGoogleService.revokeToken).not.toHaveBeenCalled();
      expect(mockUserRepo.removeGoogleOAuth).not.toHaveBeenCalled();
    });

    it('should throw NotConnectedError if user not found', async () => {
      const userId = 'usr_nonexistent';

      mockUserRepo.findMeta.mockResolvedValue(null);

      await expect(useCase.execute(userId)).rejects.toThrow(NotConnectedError);

      expect(mockGoogleService.revokeToken).not.toHaveBeenCalled();
      expect(mockUserRepo.removeGoogleOAuth).not.toHaveBeenCalled();
    });

    it('should continue if token revocation fails', async () => {
      const userId = 'usr_123';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockGoogleService.revokeToken.mockRejectedValue(new Error('Revocation failed'));
      mockUserRepo.removeGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute(userId);

      // Should still succeed
      expect(result).toEqual({ disconnected: true });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to revoke token at Google:',
        expect.any(Error)
      );
      // Should still remove OAuth data
      expect(mockUserRepo.removeGoogleOAuth).toHaveBeenCalledWith(userId);
    });

    it('should skip revocation if no access token', async () => {
      const userId = 'usr_no_token';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: '', // Empty access token
          refreshToken: 'refresh_token',
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockUserRepo.removeGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ disconnected: true });
      expect(mockGoogleService.revokeToken).not.toHaveBeenCalled();
      expect(mockUserRepo.removeGoogleOAuth).toHaveBeenCalledWith(userId);
    });

    it('should handle undefined access token', async () => {
      const userId = 'usr_undefined_token';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: undefined as unknown as string, // Simulating undefined
          refreshToken: 'refresh_token',
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockUserRepo.removeGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ disconnected: true });
      expect(mockGoogleService.revokeToken).not.toHaveBeenCalled();
    });

    it('should propagate errors from findMeta', async () => {
      const userId = 'usr_123';

      mockUserRepo.findMeta.mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(userId)).rejects.toThrow('Database error');

      expect(mockGoogleService.revokeToken).not.toHaveBeenCalled();
      expect(mockUserRepo.removeGoogleOAuth).not.toHaveBeenCalled();
    });

    it('should propagate errors from removeGoogleOAuth', async () => {
      const userId = 'usr_123';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockGoogleService.revokeToken.mockResolvedValue(undefined);
      mockUserRepo.removeGoogleOAuth.mockRejectedValue(new Error('Failed to remove'));

      await expect(useCase.execute(userId)).rejects.toThrow('Failed to remove');
    });

    it('should handle googleOAuth with only required fields', async () => {
      const userId = 'usr_minimal';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: 'token',
          refreshToken: null,
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockGoogleService.revokeToken.mockResolvedValue(undefined);
      mockUserRepo.removeGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ disconnected: true });
    });

    it('should handle user with googleCalendarSync but still disconnect', async () => {
      const userId = 'usr_with_sync';
      const userMeta: UserMeta = {
        userId,
        googleOAuth: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: '2025-11-26T12:00:00.000Z',
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
        googleCalendarSync: {
          lastSyncAt: '2025-11-26T09:00:00.000Z',
          syncToken: 'sync_token_abc',
        },
        updatedAt: '2025-11-26T09:00:00.000Z',
      };

      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockGoogleService.revokeToken.mockResolvedValue(undefined);
      mockUserRepo.removeGoogleOAuth.mockResolvedValue(undefined);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ disconnected: true });
      expect(mockUserRepo.removeGoogleOAuth).toHaveBeenCalledWith(userId);
    });
  });

  describe('error handling', () => {
    it('should have proper NotConnectedError properties', async () => {
      const userId = 'usr_no_oauth';

      mockUserRepo.findMeta.mockResolvedValue({
        userId,
        updatedAt: '2025-11-26T09:00:00.000Z',
      });

      try {
        await useCase.execute(userId);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotConnectedError);
        if (error instanceof NotConnectedError) {
          expect(error.statusCode).toBe(400);
          expect(error.code).toBe('NOT_CONNECTED');
          expect(error.message).toBe('Google Calendar is not connected');
        }
      }
    });
  });
});
