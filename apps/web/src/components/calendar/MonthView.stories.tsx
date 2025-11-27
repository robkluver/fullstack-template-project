import type { Meta, StoryObj } from '@storybook/react';
import { MonthView } from './MonthView';
import type { CalendarEvent } from '@/lib/api';

const meta: Meta<typeof MonthView> = {
  title: 'Components/Calendar/MonthView',
  component: MonthView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MonthView>;

// Helper to create events for a specific month
function createMockEvents(baseDate: Date): CalendarEvent[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

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
    {
      ...baseEvent,
      eventId: 'evt-1',
      SK: 'EVENT#evt-1',
      title: 'Team Standup',
      startUtc: new Date(year, month, 5, 9, 0).toISOString(),
      endUtc: new Date(year, month, 5, 9, 30).toISOString(),
      color: '#4285F4',
    },
    {
      ...baseEvent,
      eventId: 'evt-2',
      SK: 'EVENT#evt-2',
      title: 'Sprint Planning',
      startUtc: new Date(year, month, 10, 10, 0).toISOString(),
      endUtc: new Date(year, month, 10, 12, 0).toISOString(),
      color: '#34A853',
    },
    {
      ...baseEvent,
      eventId: 'evt-3',
      SK: 'EVENT#evt-3',
      title: 'Client Meeting',
      startUtc: new Date(year, month, 10, 14, 0).toISOString(),
      endUtc: new Date(year, month, 10, 15, 0).toISOString(),
      color: '#EA4335',
    },
    {
      ...baseEvent,
      eventId: 'evt-4',
      SK: 'EVENT#evt-4',
      title: 'Design Review',
      startUtc: new Date(year, month, 15, 11, 0).toISOString(),
      endUtc: new Date(year, month, 15, 12, 0).toISOString(),
      color: '#8B5CF6',
    },
    {
      ...baseEvent,
      eventId: 'evt-5',
      SK: 'EVENT#evt-5',
      title: 'Company All-Hands',
      startUtc: new Date(year, month, 20, 0, 0).toISOString(),
      isAllDay: true,
      color: '#FBBC04',
    },
    {
      ...baseEvent,
      eventId: 'evt-6',
      SK: 'EVENT#evt-6',
      title: '1:1 with Manager',
      startUtc: new Date(year, month, 22, 15, 0).toISOString(),
      endUtc: new Date(year, month, 22, 15, 30).toISOString(),
      color: '#EC4899',
    },
    {
      ...baseEvent,
      eventId: 'evt-7',
      SK: 'EVENT#evt-7',
      title: 'Team Lunch',
      startUtc: new Date(year, month, 25, 12, 0).toISOString(),
      endUtc: new Date(year, month, 25, 13, 0).toISOString(),
      color: '#14B8A6',
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

export const BusyMonth: Story = {
  args: {
    currentDate: fixedDate,
    events: [
      ...createMockEvents(fixedDate),
      // Add more events to show "more" indicator
      ...Array.from({ length: 5 }, (_, i) => {
        const colors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#8B5CF6'];
        return {
          PK: 'USER#demo',
          SK: `EVENT#busy-${i}`,
          entityType: 'EVENT' as const,
          eventId: `busy-${i}`,
          title: `Meeting ${i + 1}`,
          startUtc: new Date(2025, 0, 10, 8 + i, 0).toISOString(),
          endUtc: new Date(2025, 0, 10, 9 + i, 0).toISOString(),
          isAllDay: false,
          status: 'CONFIRMED' as const,
          color: colors[i] || '#4285F4',
          version: 1,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        };
      }),
    ],
  },
};

export const February: Story = {
  args: {
    currentDate: new Date(2025, 1, 15), // February 2025
    events: createMockEvents(new Date(2025, 1, 15)),
  },
};

export const December: Story = {
  args: {
    currentDate: new Date(2025, 11, 15), // December 2025
    events: createMockEvents(new Date(2025, 11, 15)),
  },
};

export const WithInteractions: Story = {
  args: {
    currentDate: fixedDate,
    events: createMockEvents(fixedDate),
    onEventClick: (event) => console.log('Event clicked:', event.title),
    onDayClick: (date) => console.log('Day clicked:', date.toDateString()),
  },
};
