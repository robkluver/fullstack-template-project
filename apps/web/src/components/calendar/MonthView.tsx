'use client';

/**
 * Month View Calendar
 * Displays a traditional calendar grid with days as cells.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.1 Calendar Views
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 4.5 Calendar-Specific
 */

import { useMemo } from 'react';
import { type CalendarEvent } from '@/lib/api';
import { hexToRgba } from './EventCard';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: Date) => void;
}

// Days of the week
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Get first day of month
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Format date for comparison
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateKey(date) === formatDateKey(today);
}

// Check if a date is in the current month
function isCurrentMonth(date: Date, currentDate: Date): boolean {
  return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
}

// Check if event is on a specific day
function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const eventDate = new Date(event.startUtc);
  return formatDateKey(eventDate) === formatDateKey(day);
}

// Get all days to display in the calendar grid (6 weeks x 7 days)
function getCalendarDays(date: Date): Date[] {
  const monthStart = getMonthStart(date);

  // Start from the Sunday of the week containing the first day
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

  // Generate 42 days (6 weeks)
  const days: Date[] = [];
  const current = new Date(calendarStart);

  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Get events for a specific day (limited to first 3)
function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isEventOnDay(e, day)).slice(0, 3);
}

// Count total events for a day
function countEventsForDay(events: CalendarEvent[], day: Date): number {
  return events.filter((e) => isEventOnDay(e, day)).length;
}

export function MonthView({ currentDate, events, onEventClick, onDayClick }: MonthViewProps) {
  const calendarDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-subtle bg-surface flex-shrink-0">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 px-3 text-center text-sm font-medium text-muted uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 flex-1 min-h-[100px]">
            {week.map((day, dayIdx) => {
              const dayIsToday = isToday(day);
              const dayInCurrentMonth = isCurrentMonth(day, currentDate);
              const dayEvents = getEventsForDay(events, day);
              const totalEvents = countEventsForDay(events, day);
              const hasMore = totalEvents > 3;

              return (
                <div
                  key={dayIdx}
                  className={`border-r border-b border-subtle p-1 min-h-[100px] cursor-pointer transition-colors duration-fast last:border-r-0 hover:bg-elevated ${!dayInCurrentMonth ? 'bg-base' : ''} ${dayIsToday ? 'bg-blue-500/5' : ''}`}
                  onClick={() => onDayClick?.(day)}
                >
                  <div className="flex justify-end p-1">
                    <span className={`text-sm font-medium ${!dayInCurrentMonth ? 'text-muted' : 'text-primary'} ${dayIsToday ? 'flex items-center justify-center w-7 h-7 bg-accent text-white rounded-full' : ''}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event.eventId}
                        className="py-0.5 px-1 rounded-sm text-white text-xs whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer transition-opacity duration-fast hover:opacity-80"
                        style={{ backgroundColor: hexToRgba(event.color || '#3b82f6', 0.5) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        title={event.title}
                      >
                        {event.isAllDay ? (
                          event.title
                        ) : (
                          <>
                            <span className="font-medium mr-1">
                              {new Date(event.startUtc).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                            {event.title}
                          </>
                        )}
                      </div>
                    ))}
                    {hasMore && (
                      <div className="text-xs text-secondary py-0.5 px-1 cursor-pointer hover:text-accent">
                        +{totalEvents - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
