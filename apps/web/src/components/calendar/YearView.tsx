'use client';

/**
 * Year View Calendar
 * Displays 12 mini-month grids for quick navigation.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.1 Calendar Views
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 4.5 Calendar-Specific
 */

import { useMemo } from 'react';
import { type CalendarEvent } from '@/lib/api';

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onMonthClick?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

// Month names
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Day abbreviations
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Format date for comparison
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateKey(date) === formatDateKey(today);
}

// Check if event is on a specific day
function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const eventDate = new Date(event.startUtc);
  return formatDateKey(eventDate) === formatDateKey(day);
}

// Get all days for a mini-month (includes padding)
function getMiniMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  // Add padding for days before the first
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

// Check if a month has any events
function hasEventsInMonth(events: CalendarEvent[], year: number, month: number): boolean {
  return events.some((e) => {
    const eventDate = new Date(e.startUtc);
    return eventDate.getFullYear() === year && eventDate.getMonth() === month;
  });
}

// Count events on a day
function countEventsOnDay(events: CalendarEvent[], day: Date): number {
  return events.filter((e) => isEventOnDay(e, day)).length;
}

export function YearView({ currentDate, events, onMonthClick, onDayClick }: YearViewProps) {
  const year = currentDate.getFullYear();

  // Memoize month data
  const monthsData = useMemo(() => {
    return MONTHS.map((name, index) => ({
      name,
      index,
      days: getMiniMonthDays(year, index),
      hasEvents: hasEventsInMonth(events, year, index),
    }));
  }, [year, events]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <div className="flex items-center justify-center py-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-primary m-0">{year}</h2>
      </div>

      <div className="grid grid-cols-4 gap-4 max-w-[1200px] mx-auto lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2">
        {monthsData.map((month) => (
          <div
            key={month.index}
            className={`bg-surface border rounded-md p-3 cursor-pointer transition-all duration-fast hover:border-visible hover:shadow-lg ${month.hasEvents ? 'border-accent' : 'border-subtle'}`}
            onClick={() => onMonthClick?.(new Date(year, month.index, 1))}
          >
            <div className="text-center mb-2">
              <span className="text-sm font-semibold text-primary">{month.name}</span>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAYS.map((day, i) => (
                <span key={i} className="text-xs text-muted text-center">{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {month.days.map((day, i) => {
                if (!day) {
                  return <span key={i} className="aspect-square" />;
                }

                const dayIsToday = isToday(day);
                const eventCount = countEventsOnDay(events, day);
                const hasEvents = eventCount > 0;

                return (
                  <span
                    key={i}
                    className={`flex items-center justify-center relative aspect-square text-xs rounded-sm cursor-pointer transition-all duration-fast hover:bg-elevated hover:text-primary ${dayIsToday ? 'bg-accent text-white font-semibold' : hasEvents ? 'font-medium text-primary' : 'text-secondary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick?.(day);
                    }}
                    title={hasEvents ? `${eventCount} event${eventCount > 1 ? 's' : ''}` : undefined}
                  >
                    {day.getDate()}
                    {hasEvents && (
                      <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dayIsToday ? 'bg-white' : 'bg-accent'}`} />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
