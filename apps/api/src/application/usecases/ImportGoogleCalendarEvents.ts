/**
 * Import Google Calendar Events Use Case
 *
 * Orchestrates the business logic for importing events from Google Calendar.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { injectable, inject } from 'tsyringe';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import type { EventRepository } from '../../domain/interfaces/EventRepository.js';
import type { NotificationRepository } from '../../domain/interfaces/NotificationRepository.js';
import type { GoogleCalendarServicePort } from '../../domain/interfaces/GoogleCalendarService.js';
import type {
  GoogleCalendarEvent,
  NexusEventFromGoogle,
  ImportConflict,
  GoogleImportResult,
} from '../../domain/entities/GoogleOAuth.js';
import {
  NotConnectedError,
  ReauthRequiredError,
  TokenExpiredError,
  SyncTokenInvalidError,
} from '../../lib/errors.js';

@injectable()
export class ImportGoogleCalendarEvents {
  constructor(
    @inject('UserRepository') private userRepo: UserRepository,
    @inject('EventRepository') private eventRepo: EventRepository,
    @inject('NotificationRepository') private notificationRepo: NotificationRepository,
    @inject('GoogleCalendarService') private googleService: GoogleCalendarServicePort
  ) {}

  async execute(userId: string): Promise<GoogleImportResult> {
    // Get user's OAuth tokens and sync state
    const userMeta = await this.userRepo.findMeta(userId);

    if (!userMeta?.googleOAuth) {
      throw new NotConnectedError('Google Calendar');
    }

    const { googleOAuth, googleCalendarSync } = userMeta;

    // Get valid access token (refreshes if needed)
    let accessToken: string;
    try {
      accessToken = await this.getValidAccessToken(userId, googleOAuth);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new ReauthRequiredError('Google Calendar');
      }
      throw error;
    }

    // Fetch events from Google Calendar
    let fetchResult;
    try {
      fetchResult = await this.googleService.fetchEvents(accessToken, {
        syncToken: googleCalendarSync?.syncToken,
      });
    } catch (error) {
      if (error instanceof SyncTokenInvalidError) {
        // Sync token invalid - do full sync
        fetchResult = await this.googleService.fetchEvents(accessToken);
      } else {
        throw error;
      }
    }

    // Get existing imported events for conflict detection
    const existingEvents = await this.eventRepo.findGoogleSyncedEvents(userId);
    const existingByGoogleId = new Map(
      existingEvents.map((e) => [e.googleEventId, e])
    );

    // Track import results
    let imported = 0;
    let skipped = 0;
    const conflicts: ImportConflict[] = [];
    const now = new Date().toISOString();

    // Process each Google event
    for (const googleEvent of fetchResult.events) {
      // Skip cancelled events
      if (googleEvent.status === 'cancelled') {
        skipped++;
        continue;
      }

      const nexusEvent = this.mapGoogleEventToNexus(googleEvent);
      const existing = existingByGoogleId.get(googleEvent.id);

      if (existing) {
        const result = await this.processExistingEvent(
          userId,
          nexusEvent,
          existing,
          googleEvent,
          now
        );

        if (result.conflict) {
          conflicts.push(result.conflict);
          skipped++;
        } else if (result.updated) {
          imported++;
        } else {
          skipped++;
        }
      } else {
        await this.createNewEvent(userId, nexusEvent, now);
        imported++;
      }
    }

    // Update sync state
    await this.userRepo.updateGoogleCalendarSync(userId, {
      lastSyncAt: now,
      syncToken: fetchResult.nextSyncToken,
    });

    // Create notification
    const notification = await this.notificationRepo.create({
      userId,
      type: 'GOOGLE_IMPORT',
      title: 'Google Calendar Import Complete',
      message: `${imported} events imported, ${conflicts.length} conflicts detected`,
      metadata: { imported, skipped, conflicts },
    });

    return {
      imported,
      skipped,
      conflicts,
      notificationId: notification.notificationId,
    };
  }

  private async getValidAccessToken(
    userId: string,
    tokens: { accessToken: string; refreshToken: string | null; expiresAt: string }
  ): Promise<string> {
    const expiresAt = new Date(tokens.expiresAt).getTime();
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (now >= expiresAt - bufferMs) {
      if (!tokens.refreshToken) {
        throw new TokenExpiredError();
      }

      const refreshed = await this.googleService.refreshAccessToken(tokens.refreshToken);
      await this.userRepo.updateGoogleAccessToken(userId, refreshed.accessToken, refreshed.expiresAt);
      return refreshed.accessToken;
    }

    return tokens.accessToken;
  }

  private async processExistingEvent(
    userId: string,
    nexusEvent: NexusEventFromGoogle,
    existing: { eventId: string; googleSyncedAt: string; googleEtag: string; updatedAt: string; version: number },
    googleEvent: GoogleCalendarEvent,
    now: string
  ): Promise<{ updated: boolean; conflict?: ImportConflict }> {
    const hasLocalChanges = existing.updatedAt > existing.googleSyncedAt;
    const hasGoogleChanges = googleEvent.etag !== existing.googleEtag;

    if (hasLocalChanges && hasGoogleChanges) {
      // Conflict - don't update
      return {
        updated: false,
        conflict: {
          eventId: existing.eventId,
          title: nexusEvent.title,
          localUpdatedAt: existing.updatedAt,
          googleUpdatedAt: googleEvent.updated,
        },
      };
    }

    if (hasGoogleChanges) {
      // Only Google changed - safe to update
      await this.eventRepo.update(userId, existing.eventId, {
        title: nexusEvent.title,
        description: nexusEvent.description,
        startUtc: nexusEvent.startUtc,
        endUtc: nexusEvent.endUtc,
        startTzid: nexusEvent.startTzid,
        endTzid: nexusEvent.endTzid,
        isAllDay: nexusEvent.isAllDay,
        location: nexusEvent.location,
        status: nexusEvent.status,
        googleSyncedAt: now,
        googleEtag: nexusEvent.googleEtag,
      }, existing.version);

      return { updated: true };
    }

    // No changes
    return { updated: false };
  }

  private async createNewEvent(
    userId: string,
    nexusEvent: NexusEventFromGoogle,
    now: string
  ): Promise<void> {
    await this.eventRepo.create({
      userId,
      title: nexusEvent.title,
      description: nexusEvent.description,
      isAllDay: nexusEvent.isAllDay,
      startUtc: nexusEvent.startUtc,
      endUtc: nexusEvent.endUtc,
      startTzid: nexusEvent.startTzid,
      endTzid: nexusEvent.endTzid,
      location: nexusEvent.location,
      color: '#4285F4', // Default Google Calendar blue
      status: nexusEvent.status,
      rrule: nexusEvent.rrule,
      masterEventId: nexusEvent.masterEventId,
      originalStartUtc: nexusEvent.originalStartUtc,
      googleEventId: nexusEvent.googleEventId,
      googleCalendarId: nexusEvent.googleCalendarId,
      googleEtag: nexusEvent.googleEtag,
    });
  }

  private mapGoogleEventToNexus(
    googleEvent: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ): NexusEventFromGoogle {
    const isAllDay = !googleEvent.start.dateTime;

    let startUtc: string;
    let endUtc: string;

    if (isAllDay) {
      startUtc = `${googleEvent.start.date}T00:00:00Z`;
      endUtc = `${googleEvent.end.date}T00:00:00Z`;
    } else {
      startUtc = googleEvent.start.dateTime!;
      endUtc = googleEvent.end.dateTime!;
    }

    const statusMap: Record<string, 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'> = {
      confirmed: 'CONFIRMED',
      tentative: 'TENTATIVE',
      cancelled: 'CANCELLED',
    };

    const nexusEvent: NexusEventFromGoogle = {
      title: googleEvent.summary || '(No title)',
      description: googleEvent.description || null,
      startUtc,
      endUtc,
      startTzid: googleEvent.start.timeZone || null,
      endTzid: googleEvent.end.timeZone || null,
      isAllDay,
      location: googleEvent.location || null,
      status: statusMap[googleEvent.status] || 'CONFIRMED',
      googleEventId: googleEvent.id,
      googleCalendarId: calendarId,
      googleEtag: googleEvent.etag,
    };

    // Handle recurring events
    if (googleEvent.recurrence && googleEvent.recurrence.length > 0) {
      const rrule = googleEvent.recurrence.find((r) => r.startsWith('RRULE:'));
      if (rrule) {
        nexusEvent.rrule = rrule.replace('RRULE:', '');
      }
    }

    if (googleEvent.recurringEventId) {
      nexusEvent.masterEventId = googleEvent.recurringEventId;
      if (googleEvent.originalStartTime) {
        nexusEvent.originalStartUtc = googleEvent.originalStartTime.dateTime ||
          `${googleEvent.originalStartTime.date}T00:00:00Z`;
      }
    }

    return nexusEvent;
  }
}
