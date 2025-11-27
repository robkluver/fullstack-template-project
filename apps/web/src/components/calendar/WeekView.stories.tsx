import type { Meta, StoryObj } from '@storybook/react';
import { WeekView } from './WeekView';
import type { CalendarEvent } from '@/lib/api';

const meta: Meta<typeof WeekView> = {
  title: 'Components/Calendar/WeekView',
  component: WeekView,
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
type Story = StoryObj<typeof WeekView>;

// Helper to create events for a specific week
function createMockEvents(baseDate: Date): CalendarEvent[] {
  const weekStart = new Date(baseDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

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

  return [
    // Monday
    {
      ...baseEvent,
      eventId: 'evt-1',
      SK: 'EVENT#evt-1',
      title: 'Team Standup',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 9, 0).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 9, 30).toISOString(),
      color: '#4285F4',
    },
    {
      ...baseEvent,
      eventId: 'evt-2',
      SK: 'EVENT#evt-2',
      title: 'Sprint Planning',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 10, 0).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 1, 12, 0).toISOString(),
      color: '#34A853',
    },
    // Tuesday
    {
      ...baseEvent,
      eventId: 'evt-3',
      SK: 'EVENT#evt-3',
      title: 'Client Meeting',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 14, 0).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 2, 15, 30).toISOString(),
      color: '#EA4335',
    },
    // Wednesday
    {
      ...baseEvent,
      eventId: 'evt-4',
      SK: 'EVENT#evt-4',
      title: 'Design Review',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 11, 0).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 12, 0).toISOString(),
      color: '#8B5CF6',
    },
    {
      ...baseEvent,
      eventId: 'evt-5',
      SK: 'EVENT#evt-5',
      title: 'Team Lunch',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 12, 30).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 13, 30).toISOString(),
      color: '#14B8A6',
    },
    // Thursday
    {
      ...baseEvent,
      eventId: 'evt-6',
      SK: 'EVENT#evt-6',
      title: '1:1 with Manager',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4, 15, 0).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4, 15, 30).toISOString(),
      color: '#EC4899',
    },
    // Friday
    {
      ...baseEvent,
      eventId: 'evt-7',
      SK: 'EVENT#evt-7',
      title: 'Sprint Retro',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 16, 0).toISOString(),
      endUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5, 17, 0).toISOString(),
      color: '#FBBC04',
    },
    // All-day event
    {
      ...baseEvent,
      eventId: 'evt-8',
      SK: 'EVENT#evt-8',
      title: 'Company Holiday',
      startUtc: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 3, 0, 0).toISOString(),
      isAllDay: true,
      color: '#6366F1',
    },
  ];
}

// Use a fixed date for consistent stories
const fixedDate = new Date(2025, 0, 15); // January 15, 2025 (Wednesday)

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

export const BusyWeek: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      ...createMockEvents(fixedDate),
      // Add overlapping events
      {
        PK: 'USER#demo',
        SK: 'EVENT#overlap-1',
        entityType: 'EVENT',
        eventId: 'overlap-1',
        title: 'Overlapping Meeting 1',
        startUtc: new Date(2025, 0, 13, 10, 0).toISOString(),
        endUtc: new Date(2025, 0, 13, 11, 30).toISOString(),
        isAllDay: false,
        status: 'CONFIRMED',
        color: '#F97316',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
  },
};

export const WithAllDayEvents: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      {
        PK: 'USER#demo',
        SK: 'EVENT#allday-1',
        entityType: 'EVENT',
        eventId: 'allday-1',
        title: 'Conference Day 1',
        startUtc: new Date(2025, 0, 14, 0, 0).toISOString(),
        isAllDay: true,
        status: 'CONFIRMED',
        color: '#4285F4',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        PK: 'USER#demo',
        SK: 'EVENT#allday-2',
        entityType: 'EVENT',
        eventId: 'allday-2',
        title: 'Conference Day 2',
        startUtc: new Date(2025, 0, 15, 0, 0).toISOString(),
        isAllDay: true,
        status: 'CONFIRMED',
        color: '#4285F4',
        version: 1,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      ...createMockEvents(fixedDate),
    ],
  },
};

export const WithDragDrop: Story = {
  args: {
    currentDate: fixedDate,
    events: createMockEvents(fixedDate),
    onEventClick: (event) => console.log('Event clicked:', event.title),
    onSlotClick: (date, hour) => console.log('Slot clicked:', date.toDateString(), hour),
    onEventDrop: (event, newDate, newHour) => console.log('Event dropped:', event.title, newDate.toDateString(), newHour),
    onEventResize: (event, newEndHour) => console.log('Event resized:', event.title, newEndHour),
  },
};

export const WithQuickAdd: Story = {
  args: {
    currentDate: fixedDate,
    events: createMockEvents(fixedDate),
    onQuickAdd: (title, date, hour) => console.log('Quick add:', title, date.toDateString(), hour),
  },
};
