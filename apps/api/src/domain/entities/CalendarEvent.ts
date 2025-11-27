/**
 * Calendar Event Domain Entity
 *
 * Pure TypeScript types defining the calendar event data model.
 * Must NOT depend on any outer layer (no DynamoDB imports).
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md
 */

export type EventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
export type RecurType = 'MASTER' | 'INSTANCE';

/**
 * Core calendar event entity
 */
export interface CalendarEvent {
  // Identity
  eventId: string;
  userId: string;

  // Core attributes
  title: string;
  description: string | null;

  // Temporal
  isAllDay: boolean;
  startUtc: string;
  endUtc: string;
  startTzid: string | null;
  endTzid: string | null;

  // Metadata
  location: string | null;
  color: string;
  status: EventStatus;

  // Cross-linking
  links: string[];

  // Version control
  version: number;
  createdAt: string;
  updatedAt: string;

  // iCalendar compatibility
  icalUid: string;
  sequence: number;

  // Recurrence (optional)
  rrule?: string;
  recurType?: RecurType;
  masterEventId?: string;
  originalStartUtc?: string;

  // Google sync metadata (optional)
  googleEventId?: string;
  googleCalendarId?: string;
  googleSyncedAt?: string;
  googleEtag?: string;
}

/**
 * Event with Google sync tracking info
 */
export interface GoogleSyncedEvent extends CalendarEvent {
  googleEventId: string;
  googleCalendarId: string;
  googleSyncedAt: string;
  googleEtag: string;
}

/**
 * Minimal event data for conflict detection
 */
export interface EventSyncInfo {
  eventId: string;
  googleEventId: string;
  googleSyncedAt: string;
  googleEtag: string;
  updatedAt: string;
  version: number;
}

/**
 * Data for creating a new event
 */
export interface CreateEventInput {
  userId: string;
  title: string;
  description?: string | null;
  isAllDay: boolean;
  startUtc: string;
  endUtc: string;
  startTzid?: string | null;
  endTzid?: string | null;
  location?: string | null;
  color?: string;
  status?: EventStatus;
  rrule?: string;
  masterEventId?: string;
  originalStartUtc?: string;
  // Google sync
  googleEventId?: string;
  googleCalendarId?: string;
  googleEtag?: string;
}

/**
 * Data for updating an event
 */
export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  isAllDay?: boolean;
  startUtc?: string;
  endUtc?: string;
  startTzid?: string | null;
  endTzid?: string | null;
  location?: string | null;
  color?: string;
  status?: EventStatus;
  // Google sync
  googleSyncedAt?: string;
  googleEtag?: string;
}
