import type { Meta, StoryObj } from '@storybook/react';
import { ReminderCard } from './ReminderCard';
import type { Reminder } from '@/lib/api';

const meta: Meta<typeof ReminderCard> = {
  title: 'Components/Reminders/ReminderCard',
  component: ReminderCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReminderCard>;

const baseReminder: Reminder = {
  reminderId: 'rem-1',
  title: 'Call dentist for appointment',
  triggerUtc: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
  status: 'PENDING',
  color: '#f59e0b',
  version: 1,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

export const Default: Story = {
  args: {
    reminder: baseReminder,
  },
};

export const WithNote: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Submit expense report',
      note: 'Include receipts from last week\'s business trip. Make sure to add the hotel and meal expenses.',
    },
  },
};

export const DueSoon: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Meeting starts soon',
      triggerUtc: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min from now
    },
  },
};

export const Overdue: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Overdue reminder',
      triggerUtc: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    },
  },
};

export const OverdueHours: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Missed appointment',
      triggerUtc: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
  },
};

export const Snoozed: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Snoozed reminder',
      status: 'SNOOZED',
      snoozedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    },
  },
};

export const Completed: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Completed reminder',
      status: 'COMPLETED',
    },
  },
};

export const Dismissed: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Dismissed reminder',
      status: 'DISMISSED',
    },
  },
};

export const DifferentColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899'].map((color) => (
        <ReminderCard
          key={color}
          reminder={{
            ...baseReminder,
            reminderId: color,
            title: `Reminder (${color})`,
            color,
          }}
        />
      ))}
    </div>
  ),
};

export const FutureReminder: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Schedule review meeting',
      triggerUtc: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    },
  },
};

export const WithActions: Story = {
  args: {
    reminder: baseReminder,
    onComplete: () => console.log('Complete clicked'),
    onSnooze: (option) => console.log('Snooze:', option),
    onDismiss: () => console.log('Dismiss clicked'),
  },
};

export const LongNote: Story = {
  args: {
    reminder: {
      ...baseReminder,
      title: 'Review quarterly goals',
      note: 'This is a very long note that should be truncated when displayed. It contains detailed instructions about what needs to be done and should not overflow the card boundaries.',
    },
  },
};
