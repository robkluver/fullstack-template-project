/**
 * Connect Google Calendar Use Case
 *
 * Orchestrates the OAuth callback flow to connect Google Calendar.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { injectable, inject } from 'tsyringe';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import type { GoogleCalendarServicePort } from '../../domain/interfaces/GoogleCalendarService.js';
import { ValidationError, GoogleOAuthError } from '../../lib/errors.js';

export interface ConnectGoogleCalendarInput {
  code: string;
  state: string;
  redirectUri: string;
}

export interface ConnectGoogleCalendarResult {
  connected: boolean;
  email: string;
  connectedAt: string;
}

@injectable()
export class ConnectGoogleCalendar {
  constructor(
    @inject('UserRepository') private userRepo: UserRepository,
    @inject('GoogleCalendarService') private googleService: GoogleCalendarServicePort
  ) {}

  async execute(input: ConnectGoogleCalendarInput): Promise<ConnectGoogleCalendarResult> {
    const { code, state, redirectUri } = input;

    // Decode state to get userId
    const userId = this.decodeState(state);

    // Exchange authorization code for tokens
    const tokens = await this.googleService.exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refreshToken) {
      console.warn('No refresh token received - user may need to revoke and reconnect');
    }

    // Get user info from Google
    const userInfo = await this.googleService.getUserInfo(tokens.accessToken);

    // Store tokens
    const now = new Date().toISOString();

    await this.userRepo.saveGoogleOAuth(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      email: userInfo.email,
      connectedAt: now,
    });

    return {
      connected: true,
      email: userInfo.email,
      connectedAt: now,
    };
  }

  private decodeState(state: string): string {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const parts = decoded.split(':');
      if (!parts[0]) {
        throw new Error('Invalid state format');
      }
      return parts[0];
    } catch {
      throw new ValidationError('Invalid state parameter');
    }
  }
}
