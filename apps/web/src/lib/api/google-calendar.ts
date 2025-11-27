/**
 * Google Calendar API Client
 * Handles Google OAuth and calendar import operations.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { api } from './client';
import type { GoogleOAuthStatus, GoogleImportResult } from '@nexus/shared';

interface AuthorizeResponse {
  authorizationUrl: string;
  state: string;
}

interface CallbackResponse {
  connected: boolean;
  email: string;
  connectedAt: string;
}

interface RevokeResponse {
  disconnected: boolean;
}

/**
 * Get Google OAuth authorization URL
 */
export async function getGoogleAuthUrl(userId: string): Promise<AuthorizeResponse> {
  return api.get<AuthorizeResponse>(`/oauth/google/authorize?userId=${userId}`);
}

/**
 * Exchange OAuth authorization code for tokens
 */
export async function exchangeGoogleCode(
  code: string,
  state: string
): Promise<CallbackResponse> {
  return api.post<CallbackResponse>('/oauth/google/callback', { code, state });
}

/**
 * Get Google Calendar connection status
 */
export async function getGoogleCalendarStatus(userId: string): Promise<GoogleOAuthStatus> {
  return api.get<GoogleOAuthStatus>(`/users/${userId}/google-calendar/status`);
}

/**
 * Revoke Google Calendar access
 */
export async function revokeGoogleAccess(userId: string): Promise<RevokeResponse> {
  return api.delete<RevokeResponse>(`/users/${userId}/google-calendar/revoke`);
}

/**
 * Trigger Google Calendar import
 */
export async function importGoogleCalendar(userId: string): Promise<GoogleImportResult> {
  return api.post<GoogleImportResult>(`/users/${userId}/google-calendar/import`);
}
