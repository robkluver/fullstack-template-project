/**
 * Google Calendar HTTP Adapter
 *
 * Implements GoogleCalendarServicePort for external API calls.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { injectable } from 'tsyringe';
import axios, { AxiosError } from 'axios';
import type {
  GoogleCalendarServicePort,
  FetchEventsOptions,
  FetchEventsResult,
  TokenExchangeResult,
  GoogleUserInfo,
} from '../../domain/interfaces/GoogleCalendarService.js';
import type {
  TokenRefreshResult,
  GoogleEventsApiResponse,
} from '../../domain/entities/GoogleOAuth.js';
import {
  TokenRefreshError,
  SyncTokenInvalidError,
  GoogleApiError,
} from '../../lib/errors.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

@injectable()
export class GoogleCalendarAdapter implements GoogleCalendarServicePort {
  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
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

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      return {
        accessToken: access_token,
        expiresAt,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to refresh token:', axiosError.response?.data || axiosError.message);
      throw new TokenRefreshError();
    }
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<TokenExchangeResult> {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      return {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Token exchange failed:', axiosError.response?.data || axiosError.message);
      throw new GoogleApiError(
        axiosError.response?.status || 400,
        'Failed to exchange authorization code'
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to get user info:', axiosError.response?.data || axiosError.message);
      throw new GoogleApiError(
        axiosError.response?.status || 400,
        'Failed to get user info from Google'
      );
    }
  }

  async fetchEvents(
    accessToken: string,
    options: FetchEventsOptions = {}
  ): Promise<FetchEventsResult> {
    const allEvents: GoogleEventsApiResponse['items'] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');

      if (options.syncToken) {
        url.searchParams.set('syncToken', options.syncToken);
      } else {
        const now = new Date();
        const timeMin = options.timeMin || new Date(now.getFullYear() - 1, 0, 1).toISOString();
        const timeMax = options.timeMax || new Date(now.getFullYear() + 2, 11, 31).toISOString();

        url.searchParams.set('timeMin', timeMin);
        url.searchParams.set('timeMax', timeMax);
        url.searchParams.set('singleEvents', 'false');
      }

      url.searchParams.set('maxResults', '250');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      try {
        const response = await axios.get<GoogleEventsApiResponse>(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const responseData = response.data;
        allEvents.push(...(responseData.items || []));
        pageToken = responseData.nextPageToken;
        nextSyncToken = responseData.nextSyncToken;
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 410) {
          throw new SyncTokenInvalidError();
        }

        console.error('Google Calendar API error:', axiosError.response?.data || axiosError.message);
        throw new GoogleApiError(
          axiosError.response?.status || 500,
          'Google Calendar API error'
        );
      }
    } while (pageToken);

    return {
      events: allEvents,
      nextSyncToken,
    };
  }

  async revokeToken(accessToken: string): Promise<void> {
    try {
      await axios.post(
        `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        null,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      console.warn('Failed to revoke token at Google:', axiosError.response?.data || axiosError.message);
      // Don't throw - revocation failure is not critical
    }
  }
}
