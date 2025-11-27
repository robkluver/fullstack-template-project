'use client';

/**
 * Week View Calendar
 * Displays a 7-day horizontal timeline with events as blocks.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.1 Calendar Views
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 4.5 Calendar-Specific
 */

import { useMemo, useState, useCallback } from 'react';
import { type CalendarEvent } from '@/lib/api';
import { EventCard, hexToRgba } from './EventCard';
import { QuickAdd } from './QuickAdd';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
  onQuickAdd?: (title: string, date: Date, hour: number) => void;
  onEventDrop?: (event: CalendarEvent, newDate: Date, newHour: number) => void;
  onEventResize?: (event: CalendarEvent, newEndHour: number) => void;
}

// Hours to display (6am to 10pm)
const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// Get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get days of the week
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Format date for comparison
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Calculate event position and height
function getEventStyle(event: CalendarEvent) {
  const start = new Date(event.startUtc);
  const end = event.endUtc ? new Date(event.endUtc) : new Date(start.getTime() + 60 * 60 * 1000);

  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;

  // Clamp to visible range
  const clampedStart = Math.max(startHour, START_HOUR);
  const clampedEnd = Math.min(endHour, END_HOUR);

  const top = ((clampedStart - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
  const height = ((clampedEnd - clampedStart) / (END_HOUR - START_HOUR)) * 100;

  return {
    top: `${top}%`,
    height: `${Math.max(height, 2)}%`, // Minimum 2% height
  };
}

// Check if event is on a specific day
function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const eventDate = new Date(event.startUtc);
  return formatDateKey(eventDate) === formatDateKey(day);
}

// Check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateKey(date) === formatDateKey(today);
}

// Get current time position
function getCurrentTimePosition(): number | null {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < START_HOUR || hour > END_HOUR) return null;
  return ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
}

export function WeekView({ currentDate, events, onEventClick, onSlotClick, onQuickAdd, onEventDrop, onEventResize }: WeekViewProps) {
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const currentTimePosition = getCurrentTimePosition();

  // Quick-add state
  const [quickAddSlot, setQuickAddSlot] = useState<{ dayIdx: number; hour: number } | null>(null);

  // Drag-drop state
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIdx: number; hour: number } | null>(null);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    weekDays.forEach((day) => {
      const key = formatDateKey(day);
      grouped[key] = events.filter((e) => isEventOnDay(e, day) && !e.isAllDay);
    });
    return grouped;
  }, [events, weekDays]);

  // All-day events
  const allDayEvents = useMemo(() => {
    return events.filter((e) => e.isAllDay);
  }, [events]);

  const handleSlotClick = (day: Date, hour: number) => {
    if (onSlotClick) {
      const slotDate = new Date(day);
      slotDate.setHours(hour, 0, 0, 0);
      onSlotClick(slotDate, hour);
    }
  };

  const handleSlotDoubleClick = useCallback((dayIdx: number, hour: number) => {
    setQuickAddSlot({ dayIdx, hour });
  }, []);

  const handleQuickAddSave = useCallback(
    (title: string, date: Date, hour: number) => {
      setQuickAddSlot(null);
      onQuickAdd?.(title, date, hour);
    },
    [onQuickAdd]
  );

  const handleQuickAddCancel = useCallback(() => {
    setQuickAddSlot(null);
  }, []);

  // Drag-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, dayIdx: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ dayIdx, hour });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dayIdx: number, hour: number) => {
      e.preventDefault();
      setDragOverSlot(null);

      try {
        const eventData = e.dataTransfer.getData('application/json');
        if (eventData) {
          const data = JSON.parse(eventData) as CalendarEvent & { _resize?: boolean };

          if (data._resize) {
            // This is a resize operation - update end time
            const { _resize, ...event } = data;
            void _resize; // Mark as intentionally unused
            onEventResize?.(event, hour + 1); // Add 1 to make it the end of that hour
          } else {
            // This is a move operation
            const targetDate = weekDays[dayIdx];
            if (targetDate) {
              onEventDrop?.(data, targetDate, hour);
            }
          }
        }
      } catch {
        // Invalid JSON or no data
      }
    },
    [weekDays, onEventDrop, onEventResize]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with day names */}
      <div className="flex border-b border-subtle bg-surface flex-shrink-0">
        <div className="w-[60px] flex-shrink-0" />
        {weekDays.map((day, idx) => {
          const dayIsToday = isToday(day);
          return (
            <div
              key={idx}
              className={`flex-1 flex flex-col items-center p-2 border-l border-subtle ${dayIsToday ? 'bg-blue-500/5' : ''}`}
            >
              <span className="text-xs text-muted uppercase tracking-wider">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={`text-lg font-semibold text-primary ${dayIsToday ? 'flex items-center justify-center w-8 h-8 bg-accent text-white rounded-full' : ''}`}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-subtle bg-surface flex-shrink-0">
          <div className="w-[60px] flex-shrink-0 flex items-center justify-center text-xs text-muted">All Day</div>
          <div className="flex-1 flex gap-1 p-1 flex-wrap">
            {allDayEvents.map((event) => (
              <div
                key={event.eventId}
                className="py-1 px-2 rounded-sm text-white text-sm cursor-pointer transition-opacity duration-fast hover:opacity-80"
                style={{ backgroundColor: hexToRgba(event.color || '#3b82f6', 0.5) }}
                onClick={() => onEventClick?.(event)}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Time column */}
        <div className="w-[60px] flex-shrink-0 border-r border-subtle">
          {HOURS.map((hour) => (
            <div key={hour} className="h-[60px] flex items-start pt-0.5 pr-2">
              <span className="text-xs text-muted text-right w-full">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1">
          {weekDays.map((day, dayIdx) => {
            const dayKey = formatDateKey(day);
            const dayEvents = eventsByDay[dayKey] || [];
            const dayIsToday = isToday(day);

            return (
              <div key={dayIdx} className={`flex-1 relative border-l border-subtle ${dayIsToday ? 'bg-blue-500/[0.02]' : ''}`}>
                {/* Hour slots */}
                {HOURS.map((hour) => {
                  const isDragOver = dragOverSlot?.dayIdx === dayIdx && dragOverSlot?.hour === hour;
                  return (
                    <div
                      key={hour}
                      className={`relative h-[60px] border-b border-subtle cursor-pointer transition-colors duration-fast hover:bg-elevated ${isDragOver ? 'bg-blue-500/15 border-2 border-dashed border-accent rounded-sm' : ''}`}
                      onClick={() => handleSlotClick(day, hour)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleSlotDoubleClick(dayIdx, hour);
                      }}
                      onDragOver={(e) => handleDragOver(e, dayIdx, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayIdx, hour)}
                    >
                      {/* Quick-add inline input */}
                      {quickAddSlot?.dayIdx === dayIdx && quickAddSlot?.hour === hour && (
                        <QuickAdd
                          date={day}
                          hour={hour}
                          onSave={handleQuickAddSave}
                          onCancel={handleQuickAddCancel}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {dayIsToday && currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                    style={{ top: `${currentTimePosition}%` }}
                  >
                    <div className="absolute -left-1 -top-[3px] w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}

                {/* Events */}
                {dayEvents.map((event) => (
                  <div
                    key={event.eventId}
                    className="absolute left-0.5 right-0.5 z-5"
                    style={getEventStyle(event)}
                  >
                    <EventCard
                      event={event}
                      onClick={() => onEventClick?.(event)}
                      draggable={!!onEventDrop}
                      resizable={!!onEventResize}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
