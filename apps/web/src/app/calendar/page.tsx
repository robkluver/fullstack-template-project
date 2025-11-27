'use client';

/**
 * Calendar Page
 * Calendar views with day, week, month, year options.
 *
 * @see docs/PRODUCT_VISION.md - Section 1 Calendar
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 4.5 Calendar-Specific
 */

import { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '@/stores';
import { DayView, WeekView, MonthView, YearView, AgendaView, EventModal } from '@/components/calendar';
import { useDayEvents, useWeekEvents, useMonthEvents, useYearEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, useCreateRecurring } from '@/hooks/use-calendar';
import { type CalendarEvent, type CreateEventInput, type UpdateEventInput, type CreateRecurringInput } from '@/lib/api';

type CalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda';

// Get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get end of week (Saturday 23:59:59)
function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function CalendarPage() {
  const setActiveNavItem = useUIStore((state) => state.setActiveNavItem);
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventSlot, setNewEventSlot] = useState<{ date: Date; hour: number } | null>(null);

  // Calculate week range for API query
  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);

  // Calculate agenda range (2 weeks from today)
  const agendaStart = new Date();
  agendaStart.setHours(0, 0, 0, 0);
  const agendaEnd = new Date(agendaStart);
  agendaEnd.setDate(agendaEnd.getDate() + 14);

  // Fetch events based on current view
  const weekEventsQuery = useWeekEvents(
    weekStart.toISOString(),
    weekEnd.toISOString()
  );
  const dayEventsQuery = useDayEvents(currentDate);
  const monthEventsQuery = useMonthEvents(currentDate);
  const yearEventsQuery = useYearEvents(currentDate);
  const agendaEventsQuery = useWeekEvents(
    agendaStart.toISOString(),
    agendaEnd.toISOString()
  );

  // Use the appropriate query based on view
  const getEventsQuery = () => {
    switch (view) {
      case 'day':
        return dayEventsQuery;
      case 'month':
        return monthEventsQuery;
      case 'year':
        return yearEventsQuery;
      case 'agenda':
        return agendaEventsQuery;
      default:
        return weekEventsQuery;
    }
  };
  const { data: events = [], isLoading, error } = getEventsQuery();

  // Mutations
  const createEvent = useCreateEvent();
  const createRecurring = useCreateRecurring();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Handle save (create or update)
  const handleSaveEvent = useCallback(
    (input: CreateEventInput | UpdateEventInput, eventId?: string, version?: number) => {
      if (eventId && version !== undefined) {
        updateEvent.mutate({ eventId, input: input as UpdateEventInput, version });
      } else {
        createEvent.mutate(input as CreateEventInput);
      }
    },
    [createEvent, updateEvent]
  );

  // Handle save recurring event
  const handleSaveRecurring = useCallback(
    (input: CreateRecurringInput) => {
      createRecurring.mutate(input);
    },
    [createRecurring]
  );

  // Handle delete
  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      deleteEvent.mutate(eventId);
    },
    [deleteEvent]
  );

  useEffect(() => {
    setActiveNavItem('calendar');
  }, [setActiveNavItem]);

  // Navigation handlers
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, view]);

  // Event handlers
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  }, []);

  const handleSlotClick = useCallback((date: Date, hour: number) => {
    setNewEventSlot({ date, hour });
    setSelectedEvent(null);
    setShowEventModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setNewEventSlot(null);
  }, []);

  // Handle day click from MonthView/YearView - switch to day view
  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setView('day');
  }, []);

  // Handle month click from YearView - switch to month view
  const handleMonthClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setView('month');
  }, []);

  // Handle quick-add from double-click
  const handleQuickAdd = useCallback(
    (title: string, date: Date, hour: number) => {
      const startDate = new Date(date);
      startDate.setHours(hour, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(hour + 1, 0, 0, 0);

      createEvent.mutate({
        title,
        startUtc: startDate.toISOString(),
        endUtc: endDate.toISOString(),
        isAllDay: false,
      });
    },
    [createEvent]
  );

  // Handle drag-to-reschedule
  const handleEventDrop = useCallback(
    (event: CalendarEvent, newDate: Date, newHour: number) => {
      // Calculate original duration
      const originalStart = new Date(event.startUtc);
      const originalEnd = event.endUtc ? new Date(event.endUtc) : new Date(originalStart.getTime() + 60 * 60 * 1000);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      // Calculate new times
      const newStart = new Date(newDate);
      newStart.setHours(newHour, 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);

      updateEvent.mutate({
        eventId: event.eventId,
        input: {
          startUtc: newStart.toISOString(),
          endUtc: newEnd.toISOString(),
        },
        version: event.version,
      });
    },
    [updateEvent]
  );

  // Handle drag-to-resize duration
  const handleEventResize = useCallback(
    (event: CalendarEvent, newEndHour: number) => {
      const eventStart = new Date(event.startUtc);
      const newEnd = new Date(eventStart);
      newEnd.setHours(newEndHour, 0, 0, 0);

      // Ensure end time is after start time
      if (newEnd.getTime() <= eventStart.getTime()) {
        return; // Invalid resize, ignore
      }

      updateEvent.mutate({
        eventId: event.eventId,
        input: {
          endUtc: newEnd.toISOString(),
        },
        version: event.version,
      });
    },
    [updateEvent]
  );

  // Keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '1':
          setView('day');
          break;
        case '2':
          setView('week');
          break;
        case '3':
          setView('month');
          break;
        case '4':
          setView('year');
          break;
        case '5':
          setView('agenda');
          break;
        case 't':
          goToToday();
          break;
        case 'ArrowLeft':
          if (!e.metaKey && !e.ctrlKey) goToPrevious();
          break;
        case 'ArrowRight':
          if (!e.metaKey && !e.ctrlKey) goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToToday, goToPrevious, goToNext]);

  const viewLabels: Record<CalendarView, string> = {
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    agenda: 'Agenda',
  };

  // Format the current date range for display
  const getDateRangeLabel = () => {
    if (view === 'week') {
      const start = weekStart;
      const end = weekEnd;
      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      const year = end.getFullYear();
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
    }
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
    if (view === 'year') {
      return currentDate.getFullYear().toString();
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Render the appropriate view
  const renderView = () => {
    if (view === 'day') {
      return (
        <DayView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
          onQuickAdd={handleQuickAdd}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
        />
      );
    }

    if (view === 'week') {
      return (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
          onQuickAdd={handleQuickAdd}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
        />
      );
    }

    if (view === 'month') {
      return (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
          onDayClick={handleDayClick}
        />
      );
    }

    if (view === 'year') {
      return (
        <YearView
          currentDate={currentDate}
          events={events}
          onMonthClick={handleMonthClick}
          onDayClick={handleDayClick}
        />
      );
    }

    // Agenda view
    return (
      <AgendaView
        events={events}
        onEventClick={handleEventClick}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="py-3 px-6 border-b border-subtle bg-surface flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-primary m-0">Calendar</h1>
            <div className="flex items-center gap-1">
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border border-visible rounded-sm text-secondary cursor-pointer transition-all duration-fast hover:text-primary hover:bg-elevated"
                onClick={goToPrevious}
                title="Previous"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                className="py-1 px-3 bg-transparent border border-visible rounded-sm text-secondary text-sm cursor-pointer transition-all duration-fast hover:text-primary hover:bg-elevated"
                onClick={goToToday}
              >
                Today
              </button>
              <button
                className="flex items-center justify-center w-8 h-8 bg-transparent border border-visible rounded-sm text-secondary cursor-pointer transition-all duration-fast hover:text-primary hover:bg-elevated"
                onClick={goToNext}
                title="Next"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <span className="text-base text-primary font-medium">{getDateRangeLabel()}</span>
          </div>
          <div className="flex gap-1 bg-base p-1 rounded-sm">
            {(['day', 'week', 'month', 'year', 'agenda'] as CalendarView[]).map((v, idx) => (
              <button
                key={v}
                className={`py-1 px-3 bg-transparent border-none rounded-sm text-sm cursor-pointer transition-all duration-fast ${view === v ? 'text-primary bg-surface' : 'text-secondary hover:text-primary hover:bg-elevated'}`}
                onClick={() => setView(v)}
                title={`${viewLabels[v]} (${idx + 1})`}
              >
                {viewLabels[v]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-base/80 z-20 text-secondary text-sm">
            <div className="w-6 h-6 border-2 border-visible border-t-accent rounded-full animate-spin" />
            <span>Loading events...</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded-sm text-red-500 text-sm m-4">
            Failed to load events. Please try again.
          </div>
        )}
        {renderView()}
      </main>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={handleCloseModal}
        event={selectedEvent}
        defaultDate={newEventSlot?.date}
        defaultHour={newEventSlot?.hour}
        onSave={handleSaveEvent}
        onSaveRecurring={handleSaveRecurring}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
