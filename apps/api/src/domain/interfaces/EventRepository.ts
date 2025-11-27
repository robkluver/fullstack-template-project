/**
 * Event Repository Interface
 *
 * Data contract for event storage operations.
 * Infrastructure layer implements this interface.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import type {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
  EventSyncInfo,
} from '../entities/CalendarEvent.js';

export interface EventRepository {
  /**
   * Create a new calendar event
   */
  create(input: CreateEventInput): Promise<CalendarEvent>;

  /**
   * Get an event by ID
   */
  findById(userId: string, eventId: string): Promise<CalendarEvent | null>;

  /**
   * Update an existing event with optimistic locking
   */
  update(
    userId: string,
    eventId: string,
    input: UpdateEventInput,
    expectedVersion: number
  ): Promise<CalendarEvent>;

  /**
   * Delete an event
   */
  delete(userId: string, eventId: string): Promise<void>;

  /**
   * Get all events imported from Google for conflict detection
   */
  findGoogleSyncedEvents(userId: string): Promise<EventSyncInfo[]>;
}
