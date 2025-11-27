'use client';

/**
 * Task Modal
 * Modal for creating and editing tasks.
 *
 * @see docs/PRODUCT_VISION.md - Section 2.1 Task Properties
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.2 Modals
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Task,
  type TaskStatus,
  type CreateTaskInput,
  type UpdateTaskInput,
  type EffortValue,
  VALID_EFFORT,
} from '@/lib/api';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  onSave: (input: CreateTaskInput) => void;
  onUpdate?: (taskId: string, input: UpdateTaskInput, version: number) => void;
  onDelete?: (taskId: string) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 - Critical' },
  { value: 2, label: 'P2 - High' },
  { value: 3, label: 'P3 - Medium' },
  { value: 4, label: 'P4 - Low' },
  { value: 5, label: 'P5 - Minimal' },
];

export function TaskModal({
  isOpen,
  onClose,
  task,
  defaultStatus = 'BACKLOG',
  onSave,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState(3);
  const [effort, setEffort] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const isEditing = !!task;

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority);
        setEffort(task.effort || '');
        setDueDate(task.dueUtc ? task.dueUtc.split('T')[0] ?? '' : '');
        setLabels(task.labels?.join(', ') || '');
      } else {
        setTitle('');
        setDescription('');
        setStatus(defaultStatus);
        setPriority(3);
        setEffort('');
        setDueDate('');
        setLabels('');
      }
      // Focus title input
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, task, defaultStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;

    const labelArray = labels
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    if (isEditing && task && onUpdate) {
      const updates: UpdateTaskInput = {};
      if (title !== task.title) updates.title = title;
      if (description !== (task.description || '')) {
        updates.description = description || null;
      }
      if (status !== task.status) updates.status = status;
      if (priority !== task.priority) updates.priority = priority;
      if (effort !== (task.effort || '')) {
        updates.effort = effort === '' ? null : (effort as EffortValue);
      }
      const newDueUtc = dueDate ? `${dueDate}T23:59:59.000Z` : null;
      if (newDueUtc !== (task.dueUtc || null)) updates.dueUtc = newDueUtc;
      if (JSON.stringify(labelArray) !== JSON.stringify(task.labels || [])) {
        updates.labels = labelArray;
      }

      if (Object.keys(updates).length > 0) {
        onUpdate(task.taskId, updates, task.version);
      }
    } else {
      const input: CreateTaskInput = {
        title: title.trim(),
        status,
        priority,
      };
      if (description) input.description = description;
      if (effort !== '') input.effort = effort as EffortValue;
      if (dueDate) input.dueUtc = `${dueDate}T23:59:59.000Z`;
      if (labelArray.length > 0) input.labels = labelArray;

      onSave(input);
    }

    onClose();
  }, [
    title,
    description,
    status,
    priority,
    effort,
    dueDate,
    labels,
    isEditing,
    task,
    onSave,
    onUpdate,
    onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (task && onDelete && confirm('Delete this task?')) {
      onDelete(task.taskId);
      onClose();
    }
  }, [task, onDelete, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] max-h-[90vh] bg-surface rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="m-0 text-lg font-semibold text-primary">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button
            className="bg-transparent border-none text-2xl text-secondary cursor-pointer p-0 leading-none hover:text-primary"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="task-title" className="text-sm font-medium text-secondary">Title</label>
            <input
              ref={titleRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              maxLength={500}
              className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="task-description" className="text-sm font-medium text-secondary">Description</label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              maxLength={10000}
              className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary resize-y min-h-[80px] focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="task-status" className="text-sm font-medium text-secondary">Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-priority" className="text-sm font-medium text-secondary">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="task-effort" className="text-sm font-medium text-secondary">Effort</label>
              <select
                id="task-effort"
                value={effort}
                onChange={(e) =>
                  setEffort(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              >
                <option value="">None</option>
                {VALID_EFFORT.map((val) => (
                  <option key={val} value={val}>
                    {val} points
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-due" className="text-sm font-medium text-secondary">Due Date</label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="task-labels" className="text-sm font-medium text-secondary">Labels</label>
            <input
              id="task-labels"
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="bug, feature, security (comma separated)"
              className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-subtle gap-3">
          {isEditing && onDelete && (
            <button
              className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-transparent border border-subtle text-secondary hover:bg-elevated"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-accent border-none text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={!title.trim()}
            >
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
