/**
 * Google Calendar Service Interface
 *
 * Data contract for Google Calendar API interactions.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import type {
  GoogleCalendarEvent,
  TokenRefreshResult,
} from '../entities/GoogleOAuth.js';

export interface FetchEventsOptions {
  syncToken?: string;
  timeMin?: string;
  timeMax?: string;
}

export interface FetchEventsResult {
  events: GoogleCalendarEvent[];
  nextSyncToken?: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

export interface GoogleUserInfo {
  email: string;
  verified_email: boolean;
}

export interface GoogleCalendarServicePort {
  /**
   * Refresh an expired access token
   */
  refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult>;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<TokenExchangeResult>;

  /**
   * Get user info from Google
   */
  getUserInfo(accessToken: string): Promise<GoogleUserInfo>;

  /**
   * Fetch events from Google Calendar
   */
  fetchEvents(
    accessToken: string,
    options?: FetchEventsOptions
  ): Promise<FetchEventsResult>;

  /**
   * Revoke an access token at Google
   */
  revokeToken(accessToken: string): Promise<void>;
}
