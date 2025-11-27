'use client';

/**
 * Day View Calendar
 * Displays a single day vertical timeline with events as blocks.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.1 Calendar Views
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 4.5 Calendar-Specific
 */

import { useMemo, useState, useCallback } from 'react';
import { type CalendarEvent } from '@/lib/api';
import { EventCard, hexToRgba } from './EventCard';
import { QuickAdd } from './QuickAdd';

interface DayViewProps {
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

export function DayView({ currentDate, events, onEventClick, onSlotClick, onQuickAdd, onEventDrop, onEventResize }: DayViewProps) {
  const dayIsToday = isToday(currentDate);
  const currentTimePosition = dayIsToday ? getCurrentTimePosition() : null;

  // Quick-add state
  const [quickAddHour, setQuickAddHour] = useState<number | null>(null);

  // Drag-drop state
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  // Filter events for this day
  const dayEvents = useMemo(() => {
    return events.filter((e) => isEventOnDay(e, currentDate) && !e.isAllDay);
  }, [events, currentDate]);

  // All-day events
  const allDayEvents = useMemo(() => {
    return events.filter((e) => e.isAllDay && isEventOnDay(e, currentDate));
  }, [events, currentDate]);

  const handleSlotClick = (hour: number) => {
    if (onSlotClick) {
      const slotDate = new Date(currentDate);
      slotDate.setHours(hour, 0, 0, 0);
      onSlotClick(slotDate, hour);
    }
  };

  const handleSlotDoubleClick = useCallback((hour: number) => {
    setQuickAddHour(hour);
  }, []);

  const handleQuickAddSave = useCallback(
    (title: string, date: Date, hour: number) => {
      setQuickAddHour(null);
      onQuickAdd?.(title, date, hour);
    },
    [onQuickAdd]
  );

  const handleQuickAddCancel = useCallback(() => {
    setQuickAddHour(null);
  }, []);

  // Drag-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverHour(hour);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverHour(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, hour: number) => {
      e.preventDefault();
      setDragOverHour(null);

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
            onEventDrop?.(data, currentDate, hour);
          }
        }
      } catch {
        // Invalid JSON or no data
      }
    },
    [currentDate, onEventDrop, onEventResize]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with day info */}
      <div className="flex border-b border-subtle bg-surface flex-shrink-0">
        <div className="w-20 flex-shrink-0" />
        <div className={`flex-1 flex items-center gap-3 p-4 ${dayIsToday ? 'bg-blue-500/5' : ''}`}>
          <span className="text-lg font-medium text-primary">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </span>
          <span className={`text-2xl font-bold text-primary ${dayIsToday ? 'flex items-center justify-center w-12 h-12 bg-accent text-white rounded-full' : ''}`}>
            {currentDate.getDate()}
          </span>
          <span className="text-base text-secondary">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-subtle bg-surface flex-shrink-0">
          <div className="w-20 flex-shrink-0 flex items-center justify-end pr-3 text-sm text-muted">All Day</div>
          <div className="flex-1 flex gap-2 p-2 flex-wrap">
            {allDayEvents.map((event) => (
              <div
                key={event.eventId}
                className="py-2 px-3 rounded-sm text-white text-sm cursor-pointer transition-opacity duration-fast hover:opacity-80"
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
        <div className="w-20 flex-shrink-0 border-r border-subtle">
          {HOURS.map((hour) => (
            <div key={hour} className="h-20 flex items-start justify-end pt-0.5 pr-3">
              <span className="text-sm text-muted">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className={`flex-1 relative ${dayIsToday ? 'bg-blue-500/[0.02]' : ''}`}>
          {/* Hour slots */}
          {HOURS.map((hour) => {
            const isDragOver = dragOverHour === hour;
            return (
              <div
                key={hour}
                className={`h-20 border-b border-subtle cursor-pointer transition-colors duration-fast relative hover:bg-elevated ${isDragOver ? 'bg-blue-500/15 border-2 border-dashed border-accent rounded-sm' : ''}`}
                onClick={() => handleSlotClick(hour)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleSlotDoubleClick(hour);
                }}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, hour)}
              >
                <div className="absolute left-0 right-0 top-1/2 h-px bg-subtle opacity-50" />
                {/* Quick-add inline input */}
                {quickAddHour === hour && (
                  <QuickAdd
                    date={currentDate}
                    hour={hour}
                    onSave={handleQuickAddSave}
                    onCancel={handleQuickAddCancel}
                  />
                )}
              </div>
            );
          })}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ top: `${currentTimePosition}%` }}
            >
              <div className="absolute -left-[5px] -top-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </div>
          )}

          {/* Events */}
          {dayEvents.map((event) => (
            <div
              key={event.eventId}
              className="absolute left-1 right-1 z-5"
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
      </div>
    </div>
  );
}
