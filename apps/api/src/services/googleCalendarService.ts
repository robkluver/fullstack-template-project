/**
 * Google Calendar Service
 *
 * Handles interactions with Google Calendar API including:
 * - Token refresh
 * - Fetching events (full and incremental sync)
 * - Mapping Google events to Nexus format
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import axios, { AxiosError } from 'axios';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../infrastructure/storage/dynamodb/client.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Google Calendar API types
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

export interface GoogleEventsResponse {
  kind: string;
  etag: string;
  summary: string;
  updated: string;
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  email: string;
  connectedAt: string;
}

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
  // Google sync metadata
  googleEventId: string;
  googleCalendarId: string;
  googleEtag: string;
  // Recurring event fields
  rrule?: string;
  masterEventId?: string;
  originalStartUtc?: string;
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: string }> {
  let data: { access_token: string; expires_in: number };

  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    data = response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Failed to refresh token:', axiosError.response?.data || axiosError.message);
    throw new Error('TOKEN_REFRESH_FAILED');
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Update the stored access token
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `USER_META#${userId}`,
      },
      UpdateExpression: 'SET googleOAuth.accessToken = :token, googleOAuth.expiresAt = :exp',
      ExpressionAttributeValues: {
        ':token': data.access_token,
        ':exp': expiresAt,
      },
    })
  );

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

/**
 * Get a valid access token, refreshing if needed
 */
export async function getValidAccessToken(
  userId: string,
  tokens: GoogleOAuthTokens
): Promise<string> {
  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(tokens.expiresAt).getTime();
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (now >= expiresAt - bufferMs) {
    if (!tokens.refreshToken) {
      throw new Error('TOKEN_EXPIRED_NO_REFRESH');
    }
    const refreshed = await refreshAccessToken(userId, tokens.refreshToken);
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}

/**
 * Fetch events from Google Calendar
 * Supports both full sync and incremental sync (using syncToken)
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  options: {
    syncToken?: string | undefined;
    timeMin?: string | undefined;
    timeMax?: string | undefined;
  } = {}
): Promise<{
  events: GoogleCalendarEvent[];
  nextSyncToken?: string | undefined;
}> {
  const allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');

    if (options.syncToken) {
      // Incremental sync
      url.searchParams.set('syncToken', options.syncToken);
    } else {
      // Full sync - get events from 1 year ago to 2 years ahead
      const now = new Date();
      const timeMin = options.timeMin || new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const timeMax = options.timeMax || new Date(now.getFullYear() + 2, 11, 31).toISOString();

      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'false'); // Get recurring events as master
    }

    url.searchParams.set('maxResults', '250');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    let responseData: GoogleEventsResponse;
    try {
      const response = await axios.get<GoogleEventsResponse>(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      responseData = response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 410) {
        // Sync token invalid - need full sync
        throw new Error('SYNC_TOKEN_INVALID');
      }
      console.error('Google Calendar API error:', axiosError.response?.data || axiosError.message);
      throw new Error('GOOGLE_API_ERROR');
    }

    allEvents.push(...(responseData.items || []));
    pageToken = responseData.nextPageToken;
    nextSyncToken = responseData.nextSyncToken;
  } while (pageToken);

  return {
    events: allEvents,
    nextSyncToken,
  };
}

/**
 * Map a Google Calendar event to Nexus event format
 */
export function mapGoogleEventToNexus(
  googleEvent: GoogleCalendarEvent,
  calendarId: string = 'primary'
): NexusEventFromGoogle {
  // Determine if all-day event
  const isAllDay = !googleEvent.start.dateTime;

  // Get start/end times
  let startUtc: string;
  let endUtc: string;

  if (isAllDay) {
    // All-day events have date only (YYYY-MM-DD)
    startUtc = `${googleEvent.start.date}T00:00:00Z`;
    endUtc = `${googleEvent.end.date}T00:00:00Z`;
  } else {
    startUtc = googleEvent.start.dateTime!;
    endUtc = googleEvent.end.dateTime!;
  }

  // Map status
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
    // This is a master event
    const rrule = googleEvent.recurrence.find((r) => r.startsWith('RRULE:'));
    if (rrule) {
      nexusEvent.rrule = rrule.replace('RRULE:', '');
    }
  }

  if (googleEvent.recurringEventId) {
    // This is an instance/exception of a recurring event
    nexusEvent.masterEventId = googleEvent.recurringEventId;
    if (googleEvent.originalStartTime) {
      nexusEvent.originalStartUtc = googleEvent.originalStartTime.dateTime ||
        `${googleEvent.originalStartTime.date}T00:00:00Z`;
    }
  }

  return nexusEvent;
}
