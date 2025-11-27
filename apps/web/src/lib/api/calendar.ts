/**
 * Calendar API
 * Endpoints for calendar events.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md
 */

import { api } from './client';

// Types based on DynamoDB spec
export interface CalendarEvent {
  PK: string;
  SK: string;
  entityType: 'EVENT' | 'MASTER' | 'INSTANCE';
  eventId: string;
  title: string;
  description?: string;
  isAllDay: boolean;
  startUtc: string;
  endUtc?: string;
  startTzid?: string | null;
  endTzid?: string | null;
  location?: string;
  color?: string;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  tags?: string[];
  reminderMinutes?: number[];
  links?: unknown[];
  version: number;
  createdAt: string;
  updatedAt: string;
  icalUid?: string;
  sequence?: number;
  // For MASTER entities
  masterId?: string;
  rrule?: string;
  rruleUntil?: string;
  exdate?: string[];
  rdate?: string[];
  hasExceptions?: boolean;
  // For INSTANCE entities
  recurrenceId?: string;
  modifiedFields?: string[];
}

export interface AgendaDay {
  date: string;
  events: CalendarEvent[];
}

export interface AgendaResponse {
  days: AgendaDay[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface CreateEventInput {
  title: string;
  description?: string;
  isAllDay: boolean;
  startUtc: string;
  endUtc?: string;
  startTzid?: string | null;
  location?: string;
  color?: string;
  status?: 'CONFIRMED' | 'TENTATIVE';
  tags?: string[];
  reminderMinutes?: number[];
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  isAllDay?: boolean;
  startUtc?: string;
  endUtc?: string;
  startTzid?: string | null;
  location?: string;
  color?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  tags?: string[];
  reminderMinutes?: number[];
}

export interface CreateRecurringInput extends CreateEventInput {
  rrule: string;
}

// User ID - in a real app, this would come from auth context
const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nexus_user_id') || 'demo_user';
  }
  return 'demo_user';
};

export const calendarApi = {
  /**
   * Get agenda view (week/day range)
   * AP1: Week/Agenda View
   */
  getAgenda: (fromDate?: string, days = 7): Promise<AgendaResponse> => {
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    params.set('days', String(days));
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<AgendaResponse>(`/users/${getUserId()}/agenda${query}`);
  },

  /**
   * Get single event
   * AP2: Single Event
   */
  getEvent: (eventId: string): Promise<CalendarEvent> => {
    return api.get<CalendarEvent>(`/users/${getUserId()}/events/${eventId}`);
  },

  /**
   * Create new event
   * AP3: Create Event
   */
  createEvent: (input: CreateEventInput): Promise<CalendarEvent> => {
    return api.post<CalendarEvent>(`/users/${getUserId()}/events`, input);
  },

  /**
   * Update existing event
   * AP4: Update Event (with optimistic locking)
   */
  updateEvent: (
    eventId: string,
    input: UpdateEventInput,
    version: number
  ): Promise<CalendarEvent> => {
    return api.patch<CalendarEvent>(
      `/users/${getUserId()}/events/${eventId}`,
      input,
      version
    );
  },

  /**
   * Delete event
   * AP6: Delete Event
   */
  deleteEvent: (eventId: string): Promise<void> => {
    return api.delete<void>(`/users/${getUserId()}/events/${eventId}`);
  },

  /**
   * Create recurring event
   * AP5: Create Recurring Event
   */
  createRecurring: (input: CreateRecurringInput): Promise<CalendarEvent> => {
    return api.post<CalendarEvent>(`/users/${getUserId()}/recurring`, input);
  },

  /**
   * Get recurring series (master + instances)
   * AP7: Get Recurring Series
   */
  getSeries: (masterId: string): Promise<{ master: CalendarEvent; instances: CalendarEvent[] }> => {
    return api.get<{ master: CalendarEvent; instances: CalendarEvent[] }>(
      `/users/${getUserId()}/events/${masterId}/series`
    );
  },

  /**
   * End recurring series from a date
   * AP9: End Recurring Series
   */
  endSeries: (masterId: string, endDate: string): Promise<CalendarEvent> => {
    return api.delete<CalendarEvent>(
      `/users/${getUserId()}/events/${masterId}/future?from=${endDate}`
    );
  },
};
