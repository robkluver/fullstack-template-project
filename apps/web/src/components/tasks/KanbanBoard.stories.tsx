import { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { KanbanBoard } from './KanbanBoard';
import type { Task, TaskStatus, KanbanBoard as KanbanBoardType, EffortValue } from '@/lib/api';

const meta: Meta<typeof KanbanBoard> = {
  title: 'Components/Tasks/KanbanBoard',
  component: KanbanBoard,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onTaskClick: action('onTaskClick'),
    onTaskMove: action('onTaskMove'),
    onAddTask: action('onAddTask'),
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', padding: '1rem', backgroundColor: 'var(--bg-base)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KanbanBoard>;

// Mock task data
const createMockTask = (
  id: string,
  title: string,
  status: TaskStatus,
  priority: number,
  daysUntilDue: number = 3,
  effort: EffortValue = 3
): Task => ({
  taskId: id,
  title,
  status,
  priority,
  effort,
  dueUtc: new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: 1,
});

const initialTasks: Task[] = [
  // Backlog
  createMockTask('task-1', 'Research competitor features', 'BACKLOG', 3, 7),
  createMockTask('task-2', 'Write technical spec', 'BACKLOG', 2, 5),
  createMockTask('task-3', 'Design system audit', 'BACKLOG', 4, 14),
  // In Progress
  createMockTask('task-4', 'Implement user authentication', 'IN_PROGRESS', 1, 2),
  createMockTask('task-5', 'Build dashboard components', 'IN_PROGRESS', 2, 3),
  // Completed
  createMockTask('task-6', 'Setup project structure', 'COMPLETED', 3, -2),
  createMockTask('task-7', 'Configure CI/CD pipeline', 'COMPLETED', 2, -1),
  // Archived
  createMockTask('task-8', 'Legacy migration (cancelled)', 'ARCHIVED', 5, -30),
];

// Helper to organize tasks into board format
function organizeTasks(tasks: Task[]): KanbanBoardType {
  const board: KanbanBoardType['board'] = {
    BACKLOG: [],
    IN_PROGRESS: [],
    COMPLETED: [],
    ARCHIVED: [],
  };

  tasks.forEach((task) => {
    board[task.status].push(task);
  });

  // Sort by priority within each column
  Object.keys(board).forEach((status) => {
    board[status as TaskStatus].sort((a, b) => a.priority - b.priority);
  });

  return {
    board,
    counts: {
      total: tasks.length,
      byStatus: {
        BACKLOG: board.BACKLOG.length,
        IN_PROGRESS: board.IN_PROGRESS.length,
        COMPLETED: board.COMPLETED.length,
        ARCHIVED: board.ARCHIVED.length,
      },
    },
  };
}

// Interactive wrapper component that manages state
function InteractiveKanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const { board, counts } = organizeTasks(tasks);

  const handleTaskMove = useCallback((taskId: string, newStatus: TaskStatus, task: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, status: newStatus } : t))
    );
    setActionLog((prev) => [
      `Moved "${task.title}" to ${newStatus}`,
      ...prev.slice(0, 4),
    ]);
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    setActionLog((prev) => [
      `Clicked: "${task.title}"`,
      ...prev.slice(0, 4),
    ]);
  }, []);

  const handleAddTask = useCallback((status: TaskStatus) => {
    const newTask = createMockTask(
      `task-${Date.now()}`,
      `New task in ${status}`,
      status,
      3,
      7
    );
    setTasks((prev) => [...prev, newTask]);
    setActionLog((prev) => [
      `Added new task to ${status}`,
      ...prev.slice(0, 4),
    ]);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 min-h-0">
        <KanbanBoard
          board={board}
          counts={counts}
          onTaskClick={handleTaskClick}
          onTaskMove={handleTaskMove}
          onAddTask={handleAddTask}
        />
      </div>

      {/* Action log panel */}
      <div className="flex-shrink-0 p-3 bg-surface rounded-md border border-subtle">
        <div className="text-xs font-semibold text-secondary mb-2">Action Log (drag tasks between columns)</div>
        <div className="text-xs text-muted space-y-1">
          {actionLog.length === 0 ? (
            <div>Drag a task to another column to see actions logged here...</div>
          ) : (
            actionLog.map((log, i) => (
              <div key={i} className="py-0.5">
                → {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Kanban board where you can drag and drop tasks between columns.
 * Tasks will persist in their new position within the story.
 */
export const Interactive: Story = {
  render: () => <InteractiveKanbanBoard />,
};

// Static story with mock data (non-interactive)
export const Default: Story = {
  args: {
    board: organizeTasks(initialTasks).board,
    counts: organizeTasks(initialTasks).counts,
  },
};

// Empty board
export const Empty: Story = {
  args: {
    board: {
      BACKLOG: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      ARCHIVED: [],
    },
    counts: {
      total: 0,
      byStatus: {
        BACKLOG: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        ARCHIVED: 0,
      },
    },
  },
};

// Board with many tasks
export const Busy: Story = {
  args: {
    board: organizeTasks([
      ...initialTasks,
      createMockTask('task-9', 'Review pull requests', 'IN_PROGRESS', 1, 1),
      createMockTask('task-10', 'Update documentation', 'BACKLOG', 3, 10),
      createMockTask('task-11', 'Fix login bug', 'IN_PROGRESS', 1, 0),
      createMockTask('task-12', 'Performance optimization', 'BACKLOG', 2, 5),
      createMockTask('task-13', 'Write unit tests', 'IN_PROGRESS', 2, 4),
      createMockTask('task-14', 'Code review feedback', 'COMPLETED', 3, -1),
    ]).board,
    counts: organizeTasks([
      ...initialTasks,
      createMockTask('task-9', 'Review pull requests', 'IN_PROGRESS', 1, 1),
      createMockTask('task-10', 'Update documentation', 'BACKLOG', 3, 10),
      createMockTask('task-11', 'Fix login bug', 'IN_PROGRESS', 1, 0),
      createMockTask('task-12', 'Performance optimization', 'BACKLOG', 2, 5),
      createMockTask('task-13', 'Write unit tests', 'IN_PROGRESS', 2, 4),
      createMockTask('task-14', 'Code review feedback', 'COMPLETED', 3, -1),
    ]).counts,
  },
};
