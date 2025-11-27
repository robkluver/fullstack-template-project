import type { Meta, StoryObj } from '@storybook/react';
import { AgendaItemCard } from './AgendaItemCard';
import type { AgendaItem } from '@/lib/api';

const meta: Meta<typeof AgendaItemCard> = {
  title: 'Components/Agenda/AgendaItemCard',
  component: AgendaItemCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AgendaItemCard>;

const mockEvent: AgendaItem = {
  entityType: 'EVENT',
  id: 'event-1',
  title: 'Team Standup',
  datetime: '2025-01-20T09:00:00Z',
  endUtc: '2025-01-20T09:30:00Z',
  isAllDay: false,
  color: '#4285F4',
};

const mockTask: AgendaItem = {
  entityType: 'TASK',
  id: 'task-1',
  title: 'Complete quarterly report',
  datetime: '2025-01-20T17:00:00Z',
  isAllDay: false,
  priority: 1,
  status: 'IN_PROGRESS',
  effort: 3,
};

const mockReminder: AgendaItem = {
  entityType: 'REMINDER',
  id: 'reminder-1',
  title: 'Call dentist for appointment',
  datetime: '2025-01-20T14:00:00Z',
  isAllDay: false,
  reminderStatus: 'PENDING',
};

export const Event: Story = {
  args: {
    item: mockEvent,
  },
};

export const EventWithLocation: Story = {
  args: {
    item: {
      ...mockEvent,
      location: 'Conference Room A',
    },
  },
};

export const AllDayEvent: Story = {
  args: {
    item: {
      entityType: 'EVENT',
      id: 'event-allday',
      title: 'Company Offsite',
      datetime: '2025-01-20T00:00:00Z',
      isAllDay: true,
      color: '#4285F4',
    },
  },
};

export const Task: Story = {
  args: {
    item: mockTask,
  },
};

export const TaskPriorities: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3, 4, 5].map((priority) => (
        <AgendaItemCard
          key={priority}
          item={{
            ...mockTask,
            id: `task-p${priority}`,
            title: `Priority ${priority} Task`,
            priority,
            status: priority === 1 ? 'IN_PROGRESS' : 'PENDING',
          }}
        />
      ))}
    </div>
  ),
};

export const TaskStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
        <AgendaItemCard
          key={status}
          item={{
            ...mockTask,
            id: `task-${status}`,
            title: `${status.replace('_', ' ').toLowerCase()} task`,
            status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
            priority: 3,
          }}
        />
      ))}
    </div>
  ),
};

export const Reminder: Story = {
  args: {
    item: mockReminder,
  },
};

export const SnoozedReminder: Story = {
  args: {
    item: {
      ...mockReminder,
      reminderStatus: 'SNOOZED',
      snoozedUntil: '2025-01-20T16:00:00Z',
    },
  },
};

export const RecurringEventInstance: Story = {
  args: {
    item: {
      entityType: 'INSTANCE',
      id: 'instance-1',
      title: 'Weekly Review',
      datetime: '2025-01-20T10:00:00Z',
      endUtc: '2025-01-20T11:00:00Z',
      isAllDay: false,
      color: '#34A853',
    },
  },
};

export const MixedAgenda: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <AgendaItemCard item={{ ...mockEvent, datetime: '2025-01-20T09:00:00Z' }} />
      <AgendaItemCard item={{ ...mockTask, datetime: '2025-01-20T10:00:00Z' }} />
      <AgendaItemCard item={{ ...mockReminder, datetime: '2025-01-20T11:00:00Z' }} />
      <AgendaItemCard
        item={{
          ...mockEvent,
          id: 'event-2',
          title: 'Client Meeting',
          datetime: '2025-01-20T14:00:00Z',
          endUtc: '2025-01-20T15:30:00Z',
          location: 'Zoom',
          color: '#EA4335',
        }}
      />
      <AgendaItemCard
        item={{
          ...mockTask,
          id: 'task-2',
          title: 'Review PRs',
          datetime: '2025-01-20T16:00:00Z',
          priority: 2,
          status: 'PENDING',
        }}
      />
    </div>
  ),
};
