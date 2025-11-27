'use client';

/**
 * Agenda View
 * Displays events in a chronological list format.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.1 Calendar Views
 * @see docs/PRODUCT_VISION.md - Section 5 Unified Agenda
 */

import { useMemo } from 'react';
import { type CalendarEvent } from '@/lib/api';
import { hexToRgba } from './EventCard';

interface AgendaViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format time for display
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Format relative date
function formatRelativeDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateKey = date.toISOString().split('T')[0];
  const todayKey = today.toISOString().split('T')[0];
  const tomorrowKey = tomorrow.toISOString().split('T')[0];

  if (dateKey === todayKey) return 'Today';
  if (dateKey === tomorrowKey) return 'Tomorrow';
  return formatDate(date);
}

// Check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
}

// Group events by date
interface EventGroup {
  date: Date;
  dateKey: string;
  label: string;
  isToday: boolean;
  events: CalendarEvent[];
}

function groupEventsByDate(events: CalendarEvent[]): EventGroup[] {
  const groups: Map<string, EventGroup> = new Map();

  events.forEach((event) => {
    const eventDate = new Date(event.startUtc);
    const dateKey = eventDate.toISOString().split('T')[0] ?? '';
    const dayStart = new Date(dateKey);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dayStart,
        dateKey,
        label: formatRelativeDate(dayStart),
        isToday: isToday(dayStart),
        events: [],
      });
    }

    groups.get(dateKey)?.events.push(event);
  });

  // Sort groups by date
  const sortedGroups = Array.from(groups.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Sort events within each group by start time
  sortedGroups.forEach((group) => {
    group.events.sort(
      (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
    );
  });

  return sortedGroups;
}

export function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const eventGroups = useMemo(() => groupEventsByDate(events), [events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center flex-1 text-center text-muted">
          <div className="mb-4 opacity-50">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 20h32" stroke="currentColor" strokeWidth="2" />
              <path d="M16 8v8M32 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg text-secondary m-0 mb-2">No events scheduled</h3>
          <p className="text-sm m-0">Events in the upcoming weeks will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {eventGroups.map((group) => (
        <div key={group.dateKey} className="bg-surface border border-subtle rounded-md overflow-hidden">
          <div className={`flex items-center justify-between py-3 px-4 bg-elevated border-b border-subtle ${group.isToday ? 'bg-blue-500/10' : ''}`}>
            <span className={`text-base font-semibold text-primary ${group.isToday ? '!text-accent' : ''}`}>{group.label}</span>
            {!group.isToday && (
              <span className="text-sm text-muted">
                {group.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            {group.events.map((event) => (
              <div
                key={event.eventId}
                className="flex items-start gap-3 py-3 px-4 cursor-pointer transition-colors duration-fast border-b border-subtle last:border-b-0 hover:bg-elevated"
                onClick={() => onEventClick?.(event)}
              >
                <div
                  className="w-1 min-h-[40px] h-full rounded-sm flex-shrink-0"
                  style={{ backgroundColor: hexToRgba(event.color || '#3b82f6', 0.5) }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-primary mb-1">{event.title}</div>
                  <div className="flex flex-wrap gap-3 text-sm text-secondary">
                    {event.isAllDay ? (
                      <span className="flex items-center gap-1">All day</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        {formatTime(event.startUtc)}
                        {event.endUtc && ` - ${formatTime(event.endUtc)}`}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1 before:content-['•'] before:text-muted before:mr-1">
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
                {event.entityType === 'MASTER' || event.entityType === 'INSTANCE' ? (
                  <span className="text-muted text-lg" title="Recurring">↻</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
