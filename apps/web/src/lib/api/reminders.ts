/**
 * Reminders API
 * Endpoints for reminder management.
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md
 */

import { api } from './client';

// Reminder status values
export type ReminderStatus = 'PENDING' | 'SNOOZED' | 'COMPLETED' | 'DISMISSED';

// Reminder entity type
export interface Reminder {
  reminderId: string;
  title: string;
  note?: string;
  triggerUtc: string;
  triggerTzid?: string | null;
  color?: string;
  status: ReminderStatus;
  snoozedUntil?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Reminders list response
export interface RemindersResponse {
  reminders: Reminder[];
  meta: {
    fromDate: string;
    toDate: string;
    total: number;
  };
}

// Create reminder input
export interface CreateReminderInput {
  title: string;
  note?: string;
  triggerUtc: string;
  triggerTzid?: string | null;
  color?: string;
}

// Update reminder input
export interface UpdateReminderInput {
  title?: string;
  note?: string | null;
  triggerUtc?: string;
  triggerTzid?: string | null;
  color?: string;
  status?: ReminderStatus;
  snoozedUntil?: string | null;
}

// Reminder creation response
export interface CreateReminderResponse {
  reminderId: string;
  title: string;
  triggerUtc: string;
  status: ReminderStatus;
  version: number;
  createdAt: string;
}

// Reminder update response
export interface UpdateReminderResponse {
  reminderId: string;
  title: string;
  status: ReminderStatus;
  triggerUtc: string;
  snoozedUntil?: string | null;
  version: number;
  updatedAt: string;
}

// Snooze preset options
export const SNOOZE_OPTIONS = [
  { value: '10min', label: '10 minutes' },
  { value: '1h', label: '1 hour' },
  { value: 'tomorrow9am', label: 'Tomorrow 9 AM' },
  { value: 'nextweek', label: 'Next week' },
] as const;

// Calculate snooze time
export function calculateSnoozeTime(option: string): string {
  const now = new Date();
  switch (option) {
    case '10min':
      now.setMinutes(now.getMinutes() + 10);
      break;
    case '1h':
      now.setHours(now.getHours() + 1);
      break;
    case 'tomorrow9am': {
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
      break;
    }
    case 'nextweek':
      now.setDate(now.getDate() + 7);
      break;
    default:
      now.setMinutes(now.getMinutes() + 10);
  }
  return now.toISOString();
}

// User ID - in a real app, this would come from auth context
const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nexus_user_id') || 'demo_user';
  }
  return 'demo_user';
};

export const remindersApi = {
  /**
   * Get pending reminders for a date range
   * AP19: Get Pending Reminders
   */
  getReminders: (fromDate?: string, days = 7, status?: ReminderStatus): Promise<RemindersResponse> => {
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    params.set('days', String(days));
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<RemindersResponse>(`/users/${getUserId()}/reminders${query}`);
  },

  /**
   * Get single reminder
   */
  getReminder: (reminderId: string): Promise<Reminder> => {
    return api.get<Reminder>(`/users/${getUserId()}/reminders/${reminderId}`);
  },

  /**
   * Create new reminder
   * AP20: Create Reminder
   */
  createReminder: (input: CreateReminderInput): Promise<CreateReminderResponse> => {
    return api.post<CreateReminderResponse>(`/users/${getUserId()}/reminders`, input);
  },

  /**
   * Update reminder
   * AP21/AP22: Snooze/Complete Reminder
   */
  updateReminder: (
    reminderId: string,
    input: UpdateReminderInput,
    version: number
  ): Promise<UpdateReminderResponse> => {
    return api.patch<UpdateReminderResponse>(
      `/users/${getUserId()}/reminders/${reminderId}`,
      input,
      version
    );
  },

  /**
   * Delete reminder
   */
  deleteReminder: (reminderId: string): Promise<void> => {
    return api.delete<void>(`/users/${getUserId()}/reminders/${reminderId}`);
  },

  /**
   * Snooze reminder (convenience method)
   */
  snooze: (
    reminderId: string,
    snoozeOption: string,
    version: number
  ): Promise<UpdateReminderResponse> => {
    const snoozedUntil = calculateSnoozeTime(snoozeOption);
    return api.patch<UpdateReminderResponse>(
      `/users/${getUserId()}/reminders/${reminderId}`,
      { status: 'SNOOZED', snoozedUntil },
      version
    );
  },

  /**
   * Complete reminder (convenience method)
   */
  complete: (reminderId: string, version: number): Promise<UpdateReminderResponse> => {
    return api.patch<UpdateReminderResponse>(
      `/users/${getUserId()}/reminders/${reminderId}`,
      { status: 'COMPLETED' },
      version
    );
  },

  /**
   * Dismiss reminder (convenience method)
   */
  dismiss: (reminderId: string, version: number): Promise<UpdateReminderResponse> => {
    return api.patch<UpdateReminderResponse>(
      `/users/${getUserId()}/reminders/${reminderId}`,
      { status: 'DISMISSED' },
      version
    );
  },
};
