/**
 * User Repository Interface
 *
 * Data contract for user and OAuth storage operations.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import type {
  GoogleOAuthTokens,
  GoogleCalendarSyncState,
} from '../entities/GoogleOAuth.js';

export interface UserMeta {
  userId: string;
  googleOAuth?: GoogleOAuthTokens;
  googleCalendarSync?: GoogleCalendarSyncState;
  updatedAt: string;
}

export interface UserRepository {
  /**
   * Get user metadata including OAuth tokens
   */
  findMeta(userId: string): Promise<UserMeta | null>;

  /**
   * Save Google OAuth tokens
   */
  saveGoogleOAuth(userId: string, tokens: GoogleOAuthTokens): Promise<void>;

  /**
   * Update only the access token and expiry
   */
  updateGoogleAccessToken(
    userId: string,
    accessToken: string,
    expiresAt: string
  ): Promise<void>;

  /**
   * Update Google Calendar sync state
   */
  updateGoogleCalendarSync(
    userId: string,
    syncState: GoogleCalendarSyncState
  ): Promise<void>;

  /**
   * Remove Google OAuth data (disconnect)
   */
  removeGoogleOAuth(userId: string): Promise<void>;
}
