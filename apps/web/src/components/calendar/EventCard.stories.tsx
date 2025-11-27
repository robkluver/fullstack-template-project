import type { Meta, StoryObj } from '@storybook/react';
import { EventCard } from './EventCard';
import type { CalendarEvent } from '@/lib/api';

const meta: Meta<typeof EventCard> = {
  title: 'Components/Calendar/EventCard',
  component: EventCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '200px', height: '80px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EventCard>;

const baseEvent: CalendarEvent = {
  PK: 'USER#demo',
  SK: 'EVENT#evt-1',
  entityType: 'EVENT',
  eventId: 'evt-1',
  title: 'Team Standup',
  isAllDay: false,
  startUtc: '2025-01-20T09:00:00Z',
  endUtc: '2025-01-20T09:30:00Z',
  status: 'CONFIRMED',
  color: '#4285F4',
  version: 1,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

export const Default: Story = {
  args: {
    event: baseEvent,
  },
};

export const WithLocation: Story = {
  args: {
    event: {
      ...baseEvent,
      title: 'Client Meeting',
      location: 'Conference Room A',
      color: '#EA4335',
    },
  },
};

export const Compact: Story = {
  args: {
    event: baseEvent,
    compact: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '150px', height: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Tentative: Story = {
  args: {
    event: {
      ...baseEvent,
      title: 'Potential Interview',
      status: 'TENTATIVE',
      color: '#FBBC04',
    },
  },
};

export const Cancelled: Story = {
  args: {
    event: {
      ...baseEvent,
      title: 'Cancelled Meeting',
      status: 'CANCELLED',
    },
  },
};

export const Recurring: Story = {
  args: {
    event: {
      ...baseEvent,
      entityType: 'INSTANCE',
      title: 'Weekly Review',
      color: '#34A853',
    },
  },
};

export const RecurringMaster: Story = {
  args: {
    event: {
      ...baseEvent,
      entityType: 'MASTER',
      title: 'Daily Standup (Series)',
      rrule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    },
  },
};

export const Draggable: Story = {
  args: {
    event: baseEvent,
    draggable: true,
  },
};

export const Resizable: Story = {
  args: {
    event: {
      ...baseEvent,
      title: 'Long Meeting',
    },
    resizable: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '200px', height: '120px' }}>
        <Story />
      </div>
    ),
  ],
};

export const DifferentColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#8B5CF6', '#EC4899'].map((color) => (
        <div key={color} style={{ width: '200px', height: '60px' }}>
          <EventCard
            event={{
              ...baseEvent,
              eventId: color,
              title: `Event (${color})`,
              color,
            }}
          />
        </div>
      ))}
    </div>
  ),
};

export const AllDayEvent: Story = {
  args: {
    event: {
      ...baseEvent,
      title: 'Company Holiday',
      isAllDay: true,
      startUtc: '2025-01-20T00:00:00Z',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '24px' }}>
        <Story />
      </div>
    ),
  ],
};
