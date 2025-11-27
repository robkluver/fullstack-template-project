/**
 * Disconnect Google Calendar Use Case
 *
 * Revokes Google Calendar access and removes stored tokens.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { injectable, inject } from 'tsyringe';
import type { UserRepository } from '../../domain/interfaces/UserRepository.js';
import type { GoogleCalendarServicePort } from '../../domain/interfaces/GoogleCalendarService.js';
import { NotConnectedError } from '../../lib/errors.js';

export interface DisconnectGoogleCalendarResult {
  disconnected: boolean;
}

@injectable()
export class DisconnectGoogleCalendar {
  constructor(
    @inject('UserRepository') private userRepo: UserRepository,
    @inject('GoogleCalendarService') private googleService: GoogleCalendarServicePort
  ) {}

  async execute(userId: string): Promise<DisconnectGoogleCalendarResult> {
    // Get current user meta to retrieve token for revocation
    const userMeta = await this.userRepo.findMeta(userId);

    if (!userMeta?.googleOAuth) {
      throw new NotConnectedError('Google Calendar');
    }

    // Revoke token at Google (best effort)
    if (userMeta.googleOAuth.accessToken) {
      try {
        await this.googleService.revokeToken(userMeta.googleOAuth.accessToken);
      } catch (error) {
        // Log but don't fail - user may have already revoked from Google
        console.warn('Failed to revoke token at Google:', error);
      }
    }

    // Remove OAuth data from storage
    await this.userRepo.removeGoogleOAuth(userId);

    return {
      disconnected: true,
    };
  }
}
