/**
 * Unified Agenda API
 * Endpoints for combined events, tasks, and reminders view.
 *
 * @see docs/backend/dynamodb-spec/07-PHASE5-CROSS-LINKING.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md
 */

import { api } from './client';

// Entity types in the unified agenda
export type UnifiedEntityType = 'EVENT' | 'INSTANCE' | 'TASK' | 'REMINDER' | 'NOTE';

// Unified agenda item
export interface AgendaItem {
  entityType: UnifiedEntityType;
  id: string;
  title: string;
  datetime: string;
  color?: string;
  // Event-specific
  endUtc?: string;
  isAllDay?: boolean;
  location?: string | null;
  // Task-specific
  status?: string;
  priority?: number;
  effort?: number;
  // Reminder-specific
  reminderStatus?: string;
  snoozedUntil?: string | null;
  // Note-specific
  isPinned?: boolean;
  body?: string;
}

// Day in the unified agenda
export interface UnifiedAgendaDay {
  date: string;
  dayName: string;
  isToday: boolean;
  items: AgendaItem[];
}

// Unified agenda response
export interface UnifiedAgendaResponse {
  agenda: UnifiedAgendaDay[];
  meta: {
    fromDate: string;
    toDate: string;
    totalItems: number;
    byType: Record<string, number>;
  };
}

// User ID - in a real app, this would come from auth context
const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nexus_user_id') || 'demo_user';
  }
  return 'demo_user';
};

export const unifiedApi = {
  /**
   * Get unified agenda (events + tasks + reminders)
   * AP31: Unified Agenda
   */
  getUnifiedAgenda: (options?: {
    from?: string;
    days?: number;
    types?: UnifiedEntityType[];
  }): Promise<UnifiedAgendaResponse> => {
    const params = new URLSearchParams();
    if (options?.from) params.set('from', options.from);
    if (options?.days) params.set('days', String(options.days));
    if (options?.types) params.set('types', options.types.join(','));
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<UnifiedAgendaResponse>(`/users/${getUserId()}/unified-agenda${query}`);
  },
};

// Helper to get entity icon name
export function getEntityIcon(entityType: UnifiedEntityType): string {
  switch (entityType) {
    case 'EVENT':
    case 'INSTANCE':
      return 'calendar';
    case 'TASK':
      return 'check-circle';
    case 'REMINDER':
      return 'bell';
    case 'NOTE':
      return 'file-text';
    default:
      return 'circle';
  }
}

// Helper to format time from ISO string
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Helper to format date range
export function formatTimeRange(startUtc: string, endUtc?: string): string {
  const start = formatTime(startUtc);
  if (!endUtc) return start;
  const end = formatTime(endUtc);
  return `${start} - ${end}`;
}
