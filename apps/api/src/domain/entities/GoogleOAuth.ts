/**
 * Google OAuth Domain Entity
 *
 * Types for Google OAuth tokens and calendar sync state.
 * Must NOT depend on any outer layer.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

/**
 * Stored OAuth tokens for Google Calendar access
 */
export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  email: string;
  connectedAt: string;
}

/**
 * Google Calendar sync state
 */
export interface GoogleCalendarSyncState {
  lastSyncAt?: string;
  syncToken?: string;
}

/**
 * Google Calendar API event structure
 */
export interface GoogleCalendarEvent {
  id: string;
  etag: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  updated: string;
  created: string;
}

/**
 * Response from Google Calendar Events API
 */
export interface GoogleEventsApiResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/**
 * Mapped Nexus event data from Google
 */
export interface NexusEventFromGoogle {
  title: string;
  description: string | null;
  startUtc: string;
  endUtc: string;
  startTzid: string | null;
  endTzid: string | null;
  isAllDay: boolean;
  location: string | null;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  googleEventId: string;
  googleCalendarId: string;
  googleEtag: string;
  rrule?: string;
  masterEventId?: string;
  originalStartUtc?: string;
}

/**
 * Import conflict information
 */
export interface ImportConflict {
  eventId: string;
  title: string;
  localUpdatedAt: string;
  googleUpdatedAt: string;
}

/**
 * Google import result
 */
export interface GoogleImportResult {
  imported: number;
  skipped: number;
  conflicts: ImportConflict[];
  notificationId: string;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  accessToken: string;
  expiresAt: string;
}
