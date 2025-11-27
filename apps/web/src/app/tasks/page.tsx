'use client';

/**
 * Tasks Page
 * Kanban board with 4 columns: Backlog, In Progress, Completed, Archived.
 *
 * @see docs/PRODUCT_VISION.md - Section 2 Tasks
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 7.3 Kanban Drag-and-Drop
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores';
import {
  tasksApi,
  type Task,
  type TaskStatus,
  type KanbanBoard as KanbanBoardType,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/lib/api';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { TaskModal } from '@/components/tasks/TaskModal';

type TaskView = 'kanban' | 'list';

// Empty board state
const EMPTY_BOARD: KanbanBoardType = {
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
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const setActiveNavItem = useUIStore((state) => state.setActiveNavItem);
  const [view, setView] = useState<TaskView>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('BACKLOG');

  useEffect(() => {
    setActiveNavItem('tasks');
  }, [setActiveNavItem]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+T or Ctrl+T to create new task
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        setSelectedTask(null);
        setDefaultStatus('IN_PROGRESS');
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Kanban board
  const {
    data: kanban,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tasks', 'kanban'],
    queryFn: () => tasksApi.getKanban(),
    staleTime: 30000, // 30 seconds
  });

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: ({
      taskId,
      input,
      version,
    }: {
      taskId: string;
      input: UpdateTaskInput;
      version: number;
    }) => tasksApi.updateTask(taskId, input, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Change status mutation (optimistic update)
  const changeStatusMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
      version,
    }: {
      taskId: string;
      status: TaskStatus;
      version: number;
    }) => tasksApi.changeStatus(taskId, status, version),
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', 'kanban'] });

      // Snapshot previous value
      const previousKanban = queryClient.getQueryData<KanbanBoardType>([
        'tasks',
        'kanban',
      ]);

      // Optimistically update
      if (previousKanban) {
        const newBoard = { ...previousKanban.board };
        let movedTask: Task | undefined;

        // Find and remove task from old column
        for (const col of Object.keys(newBoard) as TaskStatus[]) {
          const idx = newBoard[col].findIndex((t) => t.taskId === taskId);
          if (idx !== -1) {
            const foundTask = newBoard[col][idx];
            if (foundTask) {
              movedTask = { ...foundTask, status };
            }
            newBoard[col] = newBoard[col].filter((t) => t.taskId !== taskId);
            break;
          }
        }

        // Add to new column
        if (movedTask) {
          newBoard[status] = [...newBoard[status], movedTask];
        }

        // Calculate new counts
        const newCounts = {
          total: previousKanban.counts.total,
          byStatus: {
            BACKLOG: newBoard.BACKLOG.length,
            IN_PROGRESS: newBoard.IN_PROGRESS.length,
            COMPLETED: newBoard.COMPLETED.length,
            ARCHIVED: newBoard.ARCHIVED.length,
          },
        };

        queryClient.setQueryData(['tasks', 'kanban'], {
          board: newBoard,
          counts: newCounts,
        });
      }

      return { previousKanban };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousKanban) {
        queryClient.setQueryData(['tasks', 'kanban'], context.previousKanban);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Handlers
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleTaskMove = useCallback(
    (taskId: string, newStatus: TaskStatus, task: Task) => {
      changeStatusMutation.mutate({
        taskId,
        status: newStatus,
        version: task.version,
      });
    },
    [changeStatusMutation]
  );

  const handleAddTask = useCallback((status: TaskStatus) => {
    setSelectedTask(null);
    setDefaultStatus(status);
    setIsModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(
    (input: CreateTaskInput) => {
      createMutation.mutate(input);
    },
    [createMutation]
  );

  const handleUpdateTask = useCallback(
    (taskId: string, input: UpdateTaskInput, version: number) => {
      updateMutation.mutate({ taskId, input, version });
    },
    [updateMutation]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      deleteMutation.mutate(taskId);
    },
    [deleteMutation]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
  }, []);

  const board = kanban || EMPTY_BOARD;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="p-4 px-6 border-b border-subtle bg-surface">
        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
          <h1 className="text-xl font-semibold text-primary m-0">Tasks</h1>
          <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
            <div className="flex gap-1 bg-elevated p-1 rounded-sm">
              <button
                className={`py-1 px-3 bg-transparent border-none rounded-sm text-sm cursor-pointer transition-all duration-fast ${view === 'kanban' ? 'text-primary bg-surface' : 'text-secondary hover:text-primary'}`}
                onClick={() => setView('kanban')}
              >
                Kanban
              </button>
              <button
                className={`py-1 px-3 bg-transparent border-none rounded-sm text-sm cursor-pointer transition-all duration-fast ${view === 'list' ? 'text-primary bg-surface' : 'text-secondary hover:text-primary'}`}
                onClick={() => setView('list')}
              >
                List
              </button>
            </div>
            <button
              className="py-2 px-4 bg-accent border-none rounded-sm text-white text-sm font-medium cursor-pointer transition-all duration-fast hover:opacity-90"
              onClick={() => handleAddTask('BACKLOG')}
            >
              + New Task
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary gap-3">Loading tasks...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary gap-3">
            <p>Failed to load tasks</p>
            <button
              className="py-2 px-4 bg-accent border-none rounded-sm text-white cursor-pointer"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
            >
              Retry
            </button>
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard
            board={board.board}
            counts={board.counts}
            onTaskClick={handleTaskClick}
            onTaskMove={handleTaskMove}
            onAddTask={handleAddTask}
          />
        ) : (
          <div className="bg-surface border border-subtle rounded-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary bg-elevated border-b border-subtle">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary bg-elevated border-b border-subtle">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary bg-elevated border-b border-subtle">Priority</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary bg-elevated border-b border-subtle">Due</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-secondary bg-elevated border-b border-subtle">Effort</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(board.board)
                  .flat()
                  .map((task) => (
                    <tr
                      key={task.taskId}
                      onClick={() => handleTaskClick(task)}
                      className="cursor-pointer transition-colors duration-fast hover:bg-elevated"
                    >
                      <td className="py-3 px-4 text-sm text-primary border-b border-subtle font-medium">{task.title}</td>
                      <td className="py-3 px-4 text-sm text-primary border-b border-subtle">
                        <span className={`inline-block py-0.5 px-2 rounded-sm text-xs font-medium text-white ${task.status === 'BACKLOG' ? 'bg-gray-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : task.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-400'}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-primary border-b border-subtle">P{task.priority}</td>
                      <td className="py-3 px-4 text-sm text-primary border-b border-subtle">
                        {task.dueUtc
                          ? new Date(task.dueUtc).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-primary border-b border-subtle">{task.effort || '-'}</td>
                    </tr>
                  ))}
                {board.counts.total === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted p-8">
                      No tasks yet. Press <kbd className="inline-flex py-0.5 px-1.5 font-mono text-xs bg-base border border-subtle rounded-sm">Cmd+T</kbd> to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        task={selectedTask}
        defaultStatus={defaultStatus}
        onSave={handleSaveTask}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
