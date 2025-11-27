'use client';

/**
 * Reminder Modal
 * Modal for creating and editing reminders.
 *
 * @see docs/PRODUCT_VISION.md - Section 3 Reminders
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.2 Modals
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Reminder,
  type CreateReminderInput,
  type UpdateReminderInput,
} from '@/lib/api';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
  onSave: (input: CreateReminderInput) => void;
  onUpdate?: (reminderId: string, input: UpdateReminderInput, version: number) => void;
  onDelete?: (reminderId: string) => void;
}

// Default colors for reminders
const COLOR_OPTIONS = [
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#6b7280', label: 'Gray' },
];

export function ReminderModal({
  isOpen,
  onClose,
  reminder,
  onSave,
  onUpdate,
  onDelete,
}: ReminderModalProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [triggerDate, setTriggerDate] = useState('');
  const [triggerTime, setTriggerTime] = useState('09:00');
  const [color, setColor] = useState('#f59e0b');

  const titleRef = useRef<HTMLInputElement>(null);
  const isEditing = !!reminder;

  // Reset form when modal opens/closes or reminder changes
  useEffect(() => {
    if (isOpen) {
      if (reminder) {
        setTitle(reminder.title);
        setNote(reminder.note || '');
        const date = new Date(reminder.triggerUtc);
        setTriggerDate(date.toISOString().split('T')[0] ?? '');
        setTriggerTime(
          date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        );
        setColor(reminder.color || '#f59e0b');
      } else {
        setTitle('');
        setNote('');
        // Default to tomorrow at 9am
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setTriggerDate(tomorrow.toISOString().split('T')[0] ?? '');
        setTriggerTime('09:00');
        setColor('#f59e0b');
      }
      // Focus title input
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, reminder]);

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
    if (!title.trim() || !triggerDate) return;

    const triggerUtc = new Date(`${triggerDate}T${triggerTime}:00`).toISOString();

    if (isEditing && reminder && onUpdate) {
      const updates: UpdateReminderInput = {};
      if (title !== reminder.title) updates.title = title;
      if (note !== (reminder.note || '')) updates.note = note || null;
      if (triggerUtc !== reminder.triggerUtc) updates.triggerUtc = triggerUtc;
      if (color !== reminder.color) updates.color = color;

      if (Object.keys(updates).length > 0) {
        onUpdate(reminder.reminderId, updates, reminder.version);
      }
    } else {
      const input: CreateReminderInput = {
        title: title.trim(),
        triggerUtc,
        color,
      };
      if (note) input.note = note;

      onSave(input);
    }

    onClose();
  }, [
    title,
    note,
    triggerDate,
    triggerTime,
    color,
    isEditing,
    reminder,
    onSave,
    onUpdate,
    onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (reminder && onDelete && confirm('Delete this reminder?')) {
      onDelete(reminder.reminderId);
      onClose();
    }
  }, [reminder, onDelete, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[450px] max-h-[90vh] bg-surface rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="m-0 text-lg font-semibold text-primary">{isEditing ? 'Edit Reminder' : 'New Reminder'}</h2>
          <button
            className="bg-transparent border-none text-2xl text-secondary cursor-pointer p-0 leading-none hover:text-primary"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="reminder-title" className="text-sm font-medium text-secondary">Title</label>
            <input
              ref={titleRef}
              id="reminder-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Remind me to..."
              maxLength={500}
              className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reminder-note" className="text-sm font-medium text-secondary">Note (optional)</label>
            <textarea
              id="reminder-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details..."
              rows={3}
              maxLength={5000}
              className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary resize-y min-h-[80px] focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="reminder-date" className="text-sm font-medium text-secondary">Date</label>
              <input
                id="reminder-date"
                type="date"
                value={triggerDate}
                onChange={(e) => setTriggerDate(e.target.value)}
                required
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reminder-time" className="text-sm font-medium text-secondary">Time</label>
              <input
                id="reminder-time"
                type="time"
                value={triggerTime}
                onChange={(e) => setTriggerTime(e.target.value)}
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-7 h-7 border-2 rounded-full cursor-pointer transition-all duration-fast hover:scale-110 ${color === opt.value ? 'border-primary' : 'border-transparent'}`}
                  style={{ backgroundColor: opt.value }}
                  onClick={() => setColor(opt.value)}
                  title={opt.label}
                />
              ))}
            </div>
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
              disabled={!title.trim() || !triggerDate}
            >
              {isEditing ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
