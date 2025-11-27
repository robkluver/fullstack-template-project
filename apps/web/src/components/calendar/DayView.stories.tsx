import type { Meta, StoryObj } from '@storybook/react';
import { DayView } from './DayView';
import type { CalendarEvent } from '@/lib/api';

const meta: Meta<typeof DayView> = {
  title: 'Components/Calendar/DayView',
  component: DayView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '700px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DayView>;

// Helper to create events for a specific day
function createMockEvents(date: Date): CalendarEvent[] {
  const baseEvent: Omit<CalendarEvent, 'eventId' | 'title' | 'startUtc' | 'endUtc' | 'color'> = {
    PK: 'USER#demo',
    SK: 'EVENT#',
    entityType: 'EVENT',
    isAllDay: false,
    status: 'CONFIRMED',
    version: 1,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return [
    {
      ...baseEvent,
      eventId: 'evt-1',
      SK: 'EVENT#evt-1',
      title: 'Morning Standup',
      startUtc: new Date(year, month, day, 9, 0).toISOString(),
      endUtc: new Date(year, month, day, 9, 30).toISOString(),
      color: '#4285F4',
    },
    {
      ...baseEvent,
      eventId: 'evt-2',
      SK: 'EVENT#evt-2',
      title: 'Design Sprint',
      startUtc: new Date(year, month, day, 10, 0).toISOString(),
      endUtc: new Date(year, month, day, 12, 0).toISOString(),
      color: '#8B5CF6',
    },
    {
      ...baseEvent,
      eventId: 'evt-3',
      SK: 'EVENT#evt-3',
      title: 'Lunch Break',
      startUtc: new Date(year, month, day, 12, 30).toISOString(),
      endUtc: new Date(year, month, day, 13, 30).toISOString(),
      color: '#14B8A6',
    },
    {
      ...baseEvent,
      eventId: 'evt-4',
      SK: 'EVENT#evt-4',
      title: 'Client Presentation',
      startUtc: new Date(year, month, day, 14, 0).toISOString(),
      endUtc: new Date(year, month, day, 15, 30).toISOString(),
      color: '#EA4335',
    },
    {
      ...baseEvent,
      eventId: 'evt-5',
      SK: 'EVENT#evt-5',
      title: '1:1 with Manager',
      startUtc: new Date(year, month, day, 16, 0).toISOString(),
      endUtc: new Date(year, month, day, 16, 30).toISOString(),
      color: '#EC4899',
    },
  ];
}

// Use a fixed date for consistent stories
const fixedDate = new Date(2025, 0, 15); // January 15, 2025

export const Default: Story = {
  args: {
    currentDate: fixedDate,
    events: createMockEvents(fixedDate),
  },
};

export const Empty: Story = {
  args: {
    currentDate: fixedDate,
    events: [],
  },
};

export const SingleEvent: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      {
        PK: 'USER#demo',
        SK: 'EVENT#single',
        entityType: 'EVENT',
        eventId: 'single',
        title: 'Important Meeting',
        startUtc: new Date(2025, 0, 15, 11, 0).toISOString(),
        endUtc: new Date(2025, 0, 15, 12, 30).toISOString(),
        isAllDay: false,
        status: 'CONFIRMED',
        color: '#4285F4',
        location: 'Conference Room A',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
  },
};

export const WithAllDayEvent: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      {
        PK: 'USER#demo',
        SK: 'EVENT#allday',
        entityType: 'EVENT',
        eventId: 'allday',
        title: 'Company Holiday',
        startUtc: new Date(2025, 0, 15, 0, 0).toISOString(),
        isAllDay: true,
        status: 'CONFIRMED',
        color: '#FBBC04',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      ...createMockEvents(fixedDate),
    ],
  },
};

export const BusyDay: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      ...createMockEvents(fixedDate),
      {
        PK: 'USER#demo',
        SK: 'EVENT#extra-1',
        entityType: 'EVENT',
        eventId: 'extra-1',
        title: 'Code Review',
        startUtc: new Date(2025, 0, 15, 17, 0).toISOString(),
        endUtc: new Date(2025, 0, 15, 18, 0).toISOString(),
        isAllDay: false,
        status: 'CONFIRMED',
        color: '#34A853',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        PK: 'USER#demo',
        SK: 'EVENT#extra-2',
        entityType: 'EVENT',
        eventId: 'extra-2',
        title: 'Evening Yoga',
        startUtc: new Date(2025, 0, 15, 19, 0).toISOString(),
        endUtc: new Date(2025, 0, 15, 20, 0).toISOString(),
        isAllDay: false,
        status: 'CONFIRMED',
        color: '#6366F1',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
  },
};

export const TentativeAndCancelled: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      {
        PK: 'USER#demo',
        SK: 'EVENT#tentative',
        entityType: 'EVENT',
        eventId: 'tentative',
        title: 'Maybe Meeting',
        startUtc: new Date(2025, 0, 15, 10, 0).toISOString(),
        endUtc: new Date(2025, 0, 15, 11, 0).toISOString(),
        isAllDay: false,
        status: 'TENTATIVE',
        color: '#FBBC04',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        PK: 'USER#demo',
        SK: 'EVENT#cancelled',
        entityType: 'EVENT',
        eventId: 'cancelled',
        title: 'Cancelled Meeting',
        startUtc: new Date(2025, 0, 15, 14, 0).toISOString(),
        endUtc: new Date(2025, 0, 15, 15, 0).toISOString(),
        isAllDay: false,
        status: 'CANCELLED',
        color: '#64748B',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
  },
};

export const WithDragDrop: Story = {
  args: {
    currentDate: fixedDate,
    events: createMockEvents(fixedDate),
    onEventClick: (event) => console.log('Event clicked:', event.title),
    onSlotClick: (date, hour) => console.log('Slot clicked:', date.toDateString(), hour),
    onEventDrop: (event, _newDate, newHour) => console.log('Event dropped:', event.title, newHour),
    onEventResize: (event, newEndHour) => console.log('Event resized:', event.title, newEndHour),
  },
};

export const WithQuickAdd: Story = {
  args: {
    currentDate: fixedDate,
    events: createMockEvents(fixedDate),
    onQuickAdd: (title, _date, hour) => console.log('Quick add:', title, hour),
  },
};
