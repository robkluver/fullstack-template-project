/**
 * Import Google Calendar Events Use Case Unit Tests
 *
 * Tests event import orchestration including token refresh, sync, and conflict detection.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import 'reflect-metadata';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ImportGoogleCalendarEvents } from './ImportGoogleCalendarEvents.js';
import type { UserRepository, UserMeta } from '../../domain/interfaces/UserRepository.js';
import type { EventRepository } from '../../domain/interfaces/EventRepository.js';
import type { NotificationRepository, Notification } from '../../domain/interfaces/NotificationRepository.js';
import type { GoogleCalendarServicePort } from '../../domain/interfaces/GoogleCalendarService.js';
import type { GoogleCalendarEvent } from '../../domain/entities/GoogleOAuth.js';
import {
  NotConnectedError,
  ReauthRequiredError,
  SyncTokenInvalidError,
} from '../../lib/errors.js';

describe('ImportGoogleCalendarEvents', () => {
  let useCase: ImportGoogleCalendarEvents;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;
  let mockGoogleService: jest.Mocked<GoogleCalendarServicePort>;

  const mockNotification: Notification = {
    notificationId: 'notif_123',
    userId: 'usr_123',
    type: 'GOOGLE_IMPORT',
    title: 'Google Calendar Import Complete',
    message: '1 events imported, 0 conflicts detected',
    readAt: null,
    createdAt: '2025-11-26T10:00:00.000Z',
  };

  beforeEach(() => {
    mockUserRepo = {
      findMeta: jest.fn(),
      saveGoogleOAuth: jest.fn(),
      updateGoogleAccessToken: jest.fn(),
      updateGoogleCalendarSync: jest.fn(),
      removeGoogleOAuth: jest.fn(),
    } as jest.Mocked<UserRepository>;

    mockEventRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findGoogleSyncedEvents: jest.fn(),
    } as jest.Mocked<EventRepository>;

    mockNotificationRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      markAsRead: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<NotificationRepository>;

    mockGoogleService = {
      exchangeCodeForTokens: jest.fn(),
      getUserInfo: jest.fn(),
      refreshAccessToken: jest.fn(),
      fetchEvents: jest.fn(),
      revokeToken: jest.fn(),
    } as jest.Mocked<GoogleCalendarServicePort>;

    useCase = new ImportGoogleCalendarEvents(
      mockUserRepo,
      mockEventRepo,
      mockNotificationRepo,
      mockGoogleService
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createUserMeta(overrides: Partial<UserMeta> = {}): UserMeta {
    return {
      userId: 'usr_123',
      googleOAuth: {
        accessToken: 'valid_access_token',
        refreshToken: 'refresh_token',
        expiresAt: '2025-11-26T12:00:00.000Z', // 2 hours from now
        email: 'user@example.com',
        connectedAt: '2025-11-25T10:00:00.000Z',
      },
      googleCalendarSync: {
        lastSyncAt: '2025-11-26T09:00:00.000Z',
        syncToken: 'existing_sync_token',
      },
      updatedAt: '2025-11-26T09:00:00.000Z',
      ...overrides,
    };
  }

  function createGoogleEvent(overrides: Partial<GoogleCalendarEvent> = {}): GoogleCalendarEvent {
    return {
      id: 'google_event_1',
      etag: '"etag_123"',
      status: 'confirmed',
      summary: 'Test Event',
      description: 'Event description',
      start: { dateTime: '2025-11-27T14:00:00Z', timeZone: 'America/New_York' },
      end: { dateTime: '2025-11-27T15:00:00Z', timeZone: 'America/New_York' },
      updated: '2025-11-26T08:00:00.000Z',
      ...overrides,
    };
  }

  describe('execute', () => {
    it('should successfully import new events', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [createGoogleEvent()],
        nextSyncToken: 'new_sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute('usr_123');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.notificationId).toBe('notif_123');

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_123',
          title: 'Test Event',
          googleEventId: 'google_event_1',
        })
      );

      expect(mockUserRepo.updateGoogleCalendarSync).toHaveBeenCalledWith('usr_123', {
        lastSyncAt: '2025-11-26T10:00:00.000Z',
        syncToken: 'new_sync_token',
      });
    });

    it('should throw NotConnectedError if user has no OAuth', async () => {
      mockUserRepo.findMeta.mockResolvedValue({
        userId: 'usr_123',
        updatedAt: '2025-11-26T09:00:00.000Z',
      });

      await expect(useCase.execute('usr_123')).rejects.toThrow(NotConnectedError);
    });

    it('should throw NotConnectedError if user not found', async () => {
      mockUserRepo.findMeta.mockResolvedValue(null);

      await expect(useCase.execute('usr_123')).rejects.toThrow(NotConnectedError);
    });

    it('should skip cancelled events', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [
          createGoogleEvent({ status: 'cancelled' }),
          createGoogleEvent({ id: 'google_event_2' }),
        ],
        nextSyncToken: 'new_sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute('usr_123');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mockEventRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should use syncToken for incremental sync', async () => {
      const userMeta = createUserMeta();
      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [],
        nextSyncToken: 'new_sync_token',
      });
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockGoogleService.fetchEvents).toHaveBeenCalledWith(
        'valid_access_token',
        { syncToken: 'existing_sync_token' }
      );
    });

    it('should do full sync if no syncToken exists', async () => {
      const userMeta = createUserMeta({
        googleCalendarSync: undefined,
      });
      mockUserRepo.findMeta.mockResolvedValue(userMeta);
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [],
        nextSyncToken: 'new_sync_token',
      });
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockGoogleService.fetchEvents).toHaveBeenCalledWith(
        'valid_access_token',
        { syncToken: undefined }
      );
    });

    it('should retry with full sync when syncToken is invalid', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents
        .mockRejectedValueOnce(new SyncTokenInvalidError())
        .mockResolvedValueOnce({
          events: [createGoogleEvent()],
          nextSyncToken: 'fresh_sync_token',
        });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute('usr_123');

      expect(result.imported).toBe(1);
      expect(mockGoogleService.fetchEvents).toHaveBeenCalledTimes(2);
      // Second call should be without syncToken
      expect(mockGoogleService.fetchEvents).toHaveBeenLastCalledWith('valid_access_token');
    });
  });

  describe('token refresh', () => {
    it('should refresh token when expired', async () => {
      const expiredUserMeta = createUserMeta({
        googleOAuth: {
          accessToken: 'expired_token',
          refreshToken: 'refresh_token',
          expiresAt: '2025-11-26T10:03:00.000Z', // 3 minutes from now (within 5min buffer)
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
      });
      mockUserRepo.findMeta.mockResolvedValue(expiredUserMeta);
      mockGoogleService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new_access_token',
        expiresAt: '2025-11-26T11:00:00.000Z',
      });
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [],
        nextSyncToken: 'sync_token',
      });
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockGoogleService.refreshAccessToken).toHaveBeenCalledWith('refresh_token');
      expect(mockUserRepo.updateGoogleAccessToken).toHaveBeenCalledWith(
        'usr_123',
        'new_access_token',
        '2025-11-26T11:00:00.000Z'
      );
      expect(mockGoogleService.fetchEvents).toHaveBeenCalledWith(
        'new_access_token',
        expect.anything()
      );
    });

    it('should throw ReauthRequiredError when token expired and no refresh token', async () => {
      const expiredNoRefreshMeta = createUserMeta({
        googleOAuth: {
          accessToken: 'expired_token',
          refreshToken: null, // No refresh token
          expiresAt: '2025-11-26T09:00:00.000Z', // Already expired
          email: 'user@example.com',
          connectedAt: '2025-11-25T10:00:00.000Z',
        },
      });
      mockUserRepo.findMeta.mockResolvedValue(expiredNoRefreshMeta);

      await expect(useCase.execute('usr_123')).rejects.toThrow(ReauthRequiredError);
    });

    it('should use existing token if not expired', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [],
        nextSyncToken: 'sync_token',
      });
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockGoogleService.refreshAccessToken).not.toHaveBeenCalled();
      expect(mockGoogleService.fetchEvents).toHaveBeenCalledWith(
        'valid_access_token',
        expect.anything()
      );
    });
  });

  describe('conflict detection', () => {
    it('should detect conflict when both local and Google have changes', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());

      const existingEvent = {
        eventId: 'evt_local',
        googleEventId: 'google_event_1',
        googleSyncedAt: '2025-11-26T08:00:00.000Z',
        googleEtag: '"old_etag"', // Different from Google's current etag
        updatedAt: '2025-11-26T09:00:00.000Z', // Local change after sync
        version: 1,
      };
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([existingEvent]);

      const googleEvent = createGoogleEvent({
        etag: '"new_etag"', // Google has changed too
        updated: '2025-11-26T09:30:00.000Z',
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [googleEvent],
        nextSyncToken: 'new_sync_token',
      });
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute('usr_123');

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual({
        eventId: 'evt_local',
        title: 'Test Event',
        localUpdatedAt: '2025-11-26T09:00:00.000Z',
        googleUpdatedAt: '2025-11-26T09:30:00.000Z',
      });
      expect(result.skipped).toBe(1);
      expect(mockEventRepo.update).not.toHaveBeenCalled();
    });

    it('should update when only Google has changes', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());

      const existingEvent = {
        eventId: 'evt_local',
        googleEventId: 'google_event_1',
        googleSyncedAt: '2025-11-26T09:00:00.000Z',
        googleEtag: '"old_etag"',
        updatedAt: '2025-11-26T08:00:00.000Z', // Local unchanged since sync
        version: 1,
      };
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([existingEvent]);

      const googleEvent = createGoogleEvent({
        etag: '"new_etag"', // Google changed
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [googleEvent],
        nextSyncToken: 'new_sync_token',
      });
      mockEventRepo.update.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute('usr_123');

      expect(result.imported).toBe(1);
      expect(result.conflicts).toHaveLength(0);
      expect(mockEventRepo.update).toHaveBeenCalledWith(
        'usr_123',
        'evt_local',
        expect.objectContaining({
          title: 'Test Event',
          googleEtag: '"new_etag"',
        }),
        1 // version
      );
    });

    it('should skip when no changes (same etag)', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());

      const existingEvent = {
        eventId: 'evt_local',
        googleEventId: 'google_event_1',
        googleSyncedAt: '2025-11-26T08:00:00.000Z',
        googleEtag: '"etag_123"', // Same as Google
        updatedAt: '2025-11-26T07:00:00.000Z',
        version: 1,
      };
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([existingEvent]);

      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [createGoogleEvent()], // etag is '"etag_123"'
        nextSyncToken: 'new_sync_token',
      });
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      const result = await useCase.execute('usr_123');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.conflicts).toHaveLength(0);
      expect(mockEventRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('event mapping', () => {
    it('should map all-day events correctly', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);

      const allDayEvent = createGoogleEvent({
        start: { date: '2025-11-27' },
        end: { date: '2025-11-28' },
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [allDayEvent],
        nextSyncToken: 'sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isAllDay: true,
          startUtc: '2025-11-27T00:00:00Z',
          endUtc: '2025-11-28T00:00:00Z',
        })
      );
    });

    it('should map recurring events with RRULE', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);

      const recurringEvent = createGoogleEvent({
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [recurringEvent],
        nextSyncToken: 'sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        })
      );
    });

    it('should map recurring event instances with masterEventId', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);

      const instanceEvent = createGoogleEvent({
        id: 'google_event_1_20251127',
        recurringEventId: 'google_event_1',
        originalStartTime: { dateTime: '2025-11-27T14:00:00Z' },
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [instanceEvent],
        nextSyncToken: 'sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          masterEventId: 'google_event_1',
          originalStartUtc: '2025-11-27T14:00:00Z',
        })
      );
    });

    it('should use default title for events without summary', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);

      const noTitleEvent = createGoogleEvent({
        summary: undefined,
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [noTitleEvent],
        nextSyncToken: 'sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '(No title)',
        })
      );
    });

    it('should map status correctly', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);

      const tentativeEvent = createGoogleEvent({
        status: 'tentative',
      });
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [tentativeEvent],
        nextSyncToken: 'sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'TENTATIVE',
        })
      );
    });
  });

  describe('notification', () => {
    it('should create notification with import results', async () => {
      mockUserRepo.findMeta.mockResolvedValue(createUserMeta());
      mockEventRepo.findGoogleSyncedEvents.mockResolvedValue([]);
      mockGoogleService.fetchEvents.mockResolvedValue({
        events: [
          createGoogleEvent({ id: 'evt_1' }),
          createGoogleEvent({ id: 'evt_2', status: 'cancelled' }),
        ],
        nextSyncToken: 'sync_token',
      });
      mockEventRepo.create.mockResolvedValue({} as any);
      mockNotificationRepo.create.mockResolvedValue(mockNotification);

      await useCase.execute('usr_123');

      expect(mockNotificationRepo.create).toHaveBeenCalledWith({
        userId: 'usr_123',
        type: 'GOOGLE_IMPORT',
        title: 'Google Calendar Import Complete',
        message: '1 events imported, 0 conflicts detected',
        metadata: {
          imported: 1,
          skipped: 1,
          conflicts: [],
        },
      });
    });
  });
});
