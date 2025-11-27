'use client';

/**
 * Kanban Board
 * Four-column task board with drag-and-drop support.
 *
 * @see docs/PRODUCT_VISION.md - Section 2.2 Task Views
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 7.3 Kanban Drag-and-Drop
 */

import { useState, useCallback } from 'react';
import { type Task, type TaskStatus, type KanbanBoard as KanbanBoardType } from '@/lib/api';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  board: KanbanBoardType['board'];
  counts: KanbanBoardType['counts'];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus, task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'BACKLOG', label: 'Backlog' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'COMPLETED', label: 'Completed' },
  { status: 'ARCHIVED', label: 'Archived' },
];

export function KanbanBoard({
  board,
  counts,
  onTaskClick,
  onTaskMove,
  onAddTask,
}: KanbanBoardProps) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleDragStart = useCallback((task: Task) => {
    setDraggingTask(task);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTask(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, status: TaskStatus) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverColumn !== status) {
        setDragOverColumn(status);
      }
    },
    [dragOverColumn]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault();
      setDragOverColumn(null);

      try {
        const taskData = e.dataTransfer.getData('application/json');
        if (!taskData) return;

        const task = JSON.parse(taskData) as Task;
        if (task.status !== newStatus) {
          onTaskMove?.(task.taskId, newStatus, task);
        }
      } catch (err) {
        console.error('Drop error:', err);
      }
    },
    [onTaskMove]
  );

  return (
    <div className="grid grid-cols-4 gap-4 h-full min-h-0 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1">
      {COLUMNS.map(({ status, label }) => {
        const tasks = board[status] || [];
        const count = counts.byStatus[status] || 0;
        const isDragOver = dragOverColumn === status;
        const canDrop = draggingTask && draggingTask.status !== status;

        const columnClasses = [
          'flex flex-col bg-elevated rounded-md min-h-[200px] max-h-full transition-all duration-fast',
          canDrop && 'border-2 border-dashed border-subtle',
          isDragOver && 'bg-base border-accent',
        ].filter(Boolean).join(' ');

        return (
          <div
            key={status}
            className={columnClasses}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center justify-between p-3 border-b border-subtle">
              <span className="text-sm font-semibold text-primary">{label}</span>
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-base rounded-full text-xs font-medium text-secondary">
                {count}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskCard
                  key={task.taskId}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  draggable
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}

              {tasks.length === 0 && !isDragOver && (
                <div className="flex items-center justify-center h-20 text-muted text-sm">
                  No tasks
                </div>
              )}

              {isDragOver && (
                <div className="flex items-center justify-center h-[60px] border-2 border-dashed border-accent rounded-sm text-accent text-sm font-medium">
                  Drop here
                </div>
              )}
            </div>

            {status === 'BACKLOG' && (
              <button
                className="m-2 p-2 bg-transparent border-none rounded-sm text-secondary text-sm cursor-pointer text-left transition-all duration-fast hover:bg-base hover:text-primary"
                onClick={() => onAddTask?.(status)}
                title="Add task to Backlog"
              >
                + Add task
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
