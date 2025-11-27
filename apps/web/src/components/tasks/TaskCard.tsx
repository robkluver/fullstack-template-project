'use client';

/**
 * Task Card
 * Displays a task in the Kanban board.
 *
 * @see docs/PRODUCT_VISION.md - Section 2.2 Task Views
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.3 Cards
 */

import { useState, useRef } from 'react';
import { type Task } from '@/lib/api';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
}

// Priority colors (1 is highest priority)
const PRIORITY_COLORS: Record<number, string> = {
  1: 'var(--color-red)',
  2: 'var(--color-orange)',
  3: 'var(--color-yellow)',
  4: 'var(--color-blue)',
  5: 'var(--color-gray)',
};

// Format relative date
function formatDueDate(dueUtc: string): { text: string; isOverdue: boolean; isDueSoon: boolean } {
  const due = new Date(dueUtc);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const isOverdue = due < now;

  if (dueDate.getTime() === today.getTime()) {
    return { text: 'Today', isOverdue, isDueSoon: true };
  }
  if (dueDate.getTime() === tomorrow.getTime()) {
    return { text: 'Tomorrow', isOverdue: false, isDueSoon: true };
  }
  if (isOverdue) {
    const days = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return { text: `${days}d overdue`, isOverdue: true, isDueSoon: false };
  }

  // Future date beyond tomorrow
  const isDueSoon = dueDate <= tomorrow;
  return {
    text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isOverdue: false,
    isDueSoon,
  };
}

export function TaskCard({
  task,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCloneRef = useRef<HTMLElement | null>(null);
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[3];
  const dueInfo = task.dueUtc ? formatDueDate(task.dueUtc) : null;
  const isCompleted = task.status === 'COMPLETED' || task.status === 'ARCHIVED';

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify(task));
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image with slight rotation
    const target = e.currentTarget as HTMLElement;
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.transform = 'rotate(3deg)';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = `${target.offsetWidth}px`;
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, target.offsetWidth / 2, 20);

    // Store ref to clean up on drag end
    dragCloneRef.current = clone;

    onDragStart?.(task);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Clean up the drag image clone
    if (dragCloneRef.current) {
      dragCloneRef.current.remove();
      dragCloneRef.current = null;
    }
    onDragEnd?.();
  };

  // Build class names
  const cardClasses = [
    'relative p-3 pl-4 bg-surface rounded-md border-l-[3px] cursor-pointer transition-all duration-fast',
    'hover:shadow-lg',
    draggable && 'cursor-grab',
    isCompleted && 'opacity-60',
    isDragging && 'opacity-50 scale-[0.98]',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      style={{ borderLeftColor: priorityColor }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
    >
      <div className="flex flex-col gap-2">
        <div className={`text-sm font-medium text-primary leading-snug ${isCompleted ? 'line-through' : ''}`}>
          {task.title}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {dueInfo && (
            <span
              className={`text-secondary ${dueInfo.isOverdue ? '!text-red-500 font-medium' : ''} ${dueInfo.isDueSoon ? '!text-orange-500' : ''}`}
            >
              {dueInfo.text}
            </span>
          )}

          {task.effort && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-elevated rounded-sm text-xs font-medium text-secondary">
              {task.effort}
            </span>
          )}
        </div>

        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map((label) => (
              <span key={label} className="inline-block py-0.5 px-1.5 bg-elevated rounded-sm text-[10px] text-secondary">
                {label}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="text-[10px] text-muted">+{task.labels.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
