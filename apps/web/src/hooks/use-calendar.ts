/**
 * Calendar Hooks
 * React Query hooks for calendar data fetching and mutations.
 *
 * @see docs/backend/dynamodb-spec/03-PHASE1-CALENDAR.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi, type AgendaResponse, type CalendarEvent, type CreateEventInput, type UpdateEventInput } from '@/lib/api';

// Query keys
export const calendarKeys = {
  all: ['calendar'] as const,
  agenda: (fromDate?: string, days?: number) =>
    [...calendarKeys.all, 'agenda', { fromDate, days }] as const,
  event: (eventId: string) => [...calendarKeys.all, 'event', eventId] as const,
  series: (masterId: string) =>
    [...calendarKeys.all, 'series', masterId] as const,
};

/**
 * Fetch agenda view
 */
export function useAgenda(fromDate?: string, days = 7) {
  return useQuery<AgendaResponse>({
    queryKey: calendarKeys.agenda(fromDate, days),
    queryFn: () => calendarApi.getAgenda(fromDate, days),
  });
}

/**
 * Fetch events for a week range (flattened from agenda)
 * Used by WeekView component
 */
export function useWeekEvents(startUtc: string, endUtc: string) {
  // Calculate days between start and end
  const startDate = new Date(startUtc);
  const endDate = new Date(endUtc);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Format date as YYYY-MM-DD for API
  const fromDate = startDate.toISOString().split('T')[0];

  return useQuery<CalendarEvent[]>({
    queryKey: [...calendarKeys.all, 'week', fromDate, days] as const,
    queryFn: async () => {
      const response = await calendarApi.getAgenda(fromDate, days);
      // Flatten events from all days
      return response.days.flatMap((day) => day.events);
    },
  });
}

/**
 * Fetch events for a single day
 * Used by DayView component
 */
export function useDayEvents(date: Date) {
  // Format date as YYYY-MM-DD for API
  const fromDate = date.toISOString().split('T')[0];

  return useQuery<CalendarEvent[]>({
    queryKey: [...calendarKeys.all, 'day', fromDate] as const,
    queryFn: async () => {
      const response = await calendarApi.getAgenda(fromDate, 1);
      // Flatten events from all days
      return response.days.flatMap((day) => day.events);
    },
  });
}

/**
 * Fetch events for a month
 * Used by MonthView component
 */
export function useMonthEvents(date: Date) {
  // Get first day of month
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

  // Start from the Sunday of the week containing the first day
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const fromDate = calendarStart.toISOString().split('T')[0];

  return useQuery<CalendarEvent[]>({
    queryKey: [...calendarKeys.all, 'month', fromDate] as const,
    queryFn: async () => {
      const response = await calendarApi.getAgenda(fromDate, 42); // 6 weeks
      // Flatten events from all days
      return response.days.flatMap((day) => day.events);
    },
  });
}

/**
 * Fetch events for a year
 * Used by YearView component
 */
export function useYearEvents(date: Date) {
  const year = date.getFullYear();
  const fromDate = `${year}-01-01`;

  return useQuery<CalendarEvent[]>({
    queryKey: [...calendarKeys.all, 'year', year] as const,
    queryFn: async () => {
      // Fetch the entire year (366 days to cover leap years)
      const response = await calendarApi.getAgenda(fromDate, 366);
      // Flatten events from all days
      return response.days.flatMap((day) => day.events);
    },
  });
}

/**
 * Fetch single event
 */
export function useEvent(eventId: string) {
  return useQuery<CalendarEvent>({
    queryKey: calendarKeys.event(eventId),
    queryFn: () => calendarApi.getEvent(eventId),
    enabled: !!eventId,
  });
}

/**
 * Fetch recurring series
 */
export function useSeries(masterId: string) {
  return useQuery<{ master: CalendarEvent; instances: CalendarEvent[] }>({
    queryKey: calendarKeys.series(masterId),
    queryFn: () => calendarApi.getSeries(masterId),
    enabled: !!masterId,
  });
}

/**
 * Create event mutation
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEventInput) => calendarApi.createEvent(input),
    onSuccess: () => {
      // Invalidate agenda queries to refetch
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/**
 * Update event mutation
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      input,
      version,
    }: {
      eventId: string;
      input: UpdateEventInput;
      version: number;
    }) => calendarApi.updateEvent(eventId, input, version),
    onSuccess: (updatedEvent) => {
      // Update the event in cache
      queryClient.setQueryData(
        calendarKeys.event(updatedEvent.eventId),
        updatedEvent
      );
      // Invalidate agenda to refetch
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'agenda'],
      });
    },
  });
}

/**
 * Delete event mutation
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => calendarApi.deleteEvent(eventId),
    onSuccess: (_, eventId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: calendarKeys.event(eventId) });
      // Invalidate agenda
      queryClient.invalidateQueries({
        queryKey: [...calendarKeys.all, 'agenda'],
      });
    },
  });
}

/**
 * Create recurring event mutation
 */
export function useCreateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calendarApi.createRecurring,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

/**
 * End recurring series mutation
 */
export function useEndSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ masterId, endDate }: { masterId: string; endDate: string }) =>
      calendarApi.endSeries(masterId, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
