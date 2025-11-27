import type { Meta, StoryObj } from '@storybook/react';
import { TaskCard } from './TaskCard';
import type { Task } from '@/lib/api';

const meta: Meta<typeof TaskCard> = {
  title: 'Components/Tasks/TaskCard',
  component: TaskCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '280px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TaskCard>;

const baseTask: Task = {
  taskId: 'task-1',
  title: 'Implement user authentication',
  status: 'IN_PROGRESS',
  priority: 2,
  effort: 5,
  version: 1,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

export const Default: Story = {
  args: {
    task: baseTask,
  },
};

export const WithDescription: Story = {
  args: {
    task: {
      ...baseTask,
      description: 'Set up OAuth 2.0 with JWT tokens for secure authentication',
    },
  },
};

export const WithDueDate: Story = {
  args: {
    task: {
      ...baseTask,
      dueUtc: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
};

export const DueToday: Story = {
  args: {
    task: {
      ...baseTask,
      title: 'Submit report',
      dueUtc: new Date().toISOString(),
    },
  },
};

export const Overdue: Story = {
  args: {
    task: {
      ...baseTask,
      title: 'Overdue task',
      dueUtc: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
};

export const WithLabels: Story = {
  args: {
    task: {
      ...baseTask,
      labels: ['frontend', 'auth', 'security'],
    },
  },
};

export const ManyLabels: Story = {
  args: {
    task: {
      ...baseTask,
      labels: ['frontend', 'auth', 'security', 'urgent', 'review', 'team'],
    },
  },
};

export const Completed: Story = {
  args: {
    task: {
      ...baseTask,
      title: 'Completed task',
      status: 'COMPLETED',
      completedAt: '2025-01-18T14:30:00Z',
    },
  },
};

export const Archived: Story = {
  args: {
    task: {
      ...baseTask,
      title: 'Archived task',
      status: 'ARCHIVED',
    },
  },
};

export const Draggable: Story = {
  args: {
    task: baseTask,
    draggable: true,
  },
};

export const Priorities: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3, 4, 5].map((priority) => (
        <TaskCard
          key={priority}
          task={{
            ...baseTask,
            taskId: `task-p${priority}`,
            title: `Priority ${priority} task`,
            priority,
          }}
        />
      ))}
    </div>
  ),
};

export const EffortPoints: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3, 5, 8, 13].map((effort) => (
        <TaskCard
          key={effort}
          task={{
            ...baseTask,
            taskId: `task-e${effort}`,
            title: `Task with ${effort} points`,
            effort: effort as 1 | 2 | 3 | 5 | 8 | 13,
          }}
        />
      ))}
    </div>
  ),
};

export const Statuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(['BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'] as const).map((status) => (
        <TaskCard
          key={status}
          task={{
            ...baseTask,
            taskId: `task-${status}`,
            title: `${status.replace('_', ' ')} task`,
            status,
          }}
        />
      ))}
    </div>
  ),
};

export const FullFeatured: Story = {
  args: {
    task: {
      ...baseTask,
      title: 'Complete project documentation',
      description: 'Write comprehensive docs for the new API',
      priority: 1,
      effort: 8,
      dueUtc: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ['docs', 'api', 'high-priority'],
    },
    draggable: true,
  },
};
