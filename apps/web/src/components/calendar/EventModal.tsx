'use client';

/**
 * Event Modal
 * Modal for creating and editing calendar events.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.2 Event Properties
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.4 Modals
 */

import { useState, useEffect, useCallback } from 'react';
import { type CalendarEvent, type CreateEventInput, type UpdateEventInput, type CreateRecurringInput } from '@/lib/api';

// Recurrence options
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily', rrule: 'FREQ=DAILY' },
  { value: 'weekly', label: 'Weekly', rrule: 'FREQ=WEEKLY' },
  { value: 'monthly', label: 'Monthly', rrule: 'FREQ=MONTHLY' },
  { value: 'yearly', label: 'Yearly', rrule: 'FREQ=YEARLY' },
];

// Color palette from design guidelines
const COLORS = [
  { name: 'Red', value: 'var(--color-red)' },
  { name: 'Orange', value: 'var(--color-orange)' },
  { name: 'Yellow', value: 'var(--color-yellow)' },
  { name: 'Lime', value: 'var(--color-lime)' },
  { name: 'Green', value: 'var(--color-green)' },
  { name: 'Teal', value: 'var(--color-teal)' },
  { name: 'Cyan', value: 'var(--color-cyan)' },
  { name: 'Blue', value: 'var(--color-blue)' },
  { name: 'Indigo', value: 'var(--color-indigo)' },
  { name: 'Purple', value: 'var(--color-purple)' },
  { name: 'Pink', value: 'var(--color-pink)' },
  { name: 'Gray', value: 'var(--color-gray)' },
];

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null | undefined;
  defaultDate?: Date | undefined;
  defaultHour?: number | undefined;
  onSave: (input: CreateEventInput | UpdateEventInput, eventId?: string, version?: number) => void;
  onSaveRecurring?: (input: CreateRecurringInput) => void;
  onDelete?: (eventId: string) => void;
}

// Format date to YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// Format time to HH:MM
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

// Combine date and time strings into ISO string
function combineDateAndTime(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

export function EventModal({
  isOpen,
  onClose,
  event,
  defaultDate,
  defaultHour = 9,
  onSave,
  onSaveRecurring,
  onDelete,
}: EventModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('var(--color-blue)');
  const [recurrence, setRecurrence] = useState('none');
  const [isFloatingTime, setIsFloatingTime] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with event data or defaults
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setIsAllDay(event.isAllDay);
      setLocation(event.location || '');
      setColor(event.color || 'var(--color-blue)');

      const start = new Date(event.startUtc);
      setStartDate(formatDate(start));
      setStartTime(formatTime(start));

      if (event.endUtc) {
        const end = new Date(event.endUtc);
        setEndDate(formatDate(end));
        setEndTime(formatTime(end));
      }

      // Set recurrence from rrule if it exists
      if (event.rrule) {
        const match = RECURRENCE_OPTIONS.find(opt => opt.rrule && event.rrule?.includes(opt.rrule));
        setRecurrence(match?.value || 'none');
      } else {
        setRecurrence('none');
      }

      // Check if floating time (no timezone specified)
      setIsFloatingTime(event.startTzid === null || event.startTzid === undefined);
    } else if (defaultDate) {
      const date = formatDate(defaultDate);
      setStartDate(date);
      setEndDate(date);
      setStartTime(`${String(defaultHour).padStart(2, '0')}:00`);
      setEndTime(`${String(defaultHour + 1).padStart(2, '0')}:00`);
      setTitle('');
      setDescription('');
      setIsAllDay(false);
      setLocation('');
      setColor('var(--color-blue)');
      setRecurrence('none');
      setIsFloatingTime(false);
    }
  }, [event, defaultDate, defaultHour]);

  // Handle keyboard shortcuts
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

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !startDate) return;

    setIsSaving(true);
    try {
      const baseInput: CreateEventInput = {
        title: title.trim(),
        isAllDay,
        startUtc: isAllDay ? `${startDate}T00:00:00Z` : combineDateAndTime(startDate, startTime),
        endUtc: isAllDay
          ? `${endDate || startDate}T23:59:59Z`
          : combineDateAndTime(endDate || startDate, endTime),
        color,
      };

      // Set floating time (null means no timezone - time floats with user's local time)
      if (isFloatingTime) {
        baseInput.startTzid = null;
      }

      // Only include optional fields if they have values
      const trimmedDescription = description.trim();
      const trimmedLocation = location.trim();

      // Check if this is a new recurring event
      const selectedRecurrence = RECURRENCE_OPTIONS.find(opt => opt.value === recurrence);
      const isNewRecurring = !event && selectedRecurrence?.rrule && onSaveRecurring;

      if (isNewRecurring) {
        // Create recurring event
        const recurringInput: CreateRecurringInput = {
          ...baseInput,
          rrule: selectedRecurrence.rrule,
        };
        if (trimmedDescription) {
          recurringInput.description = trimmedDescription;
        }
        if (trimmedLocation) {
          recurringInput.location = trimmedLocation;
        }
        onSaveRecurring(recurringInput);
      } else {
        // Create/update regular event
        const input: CreateEventInput | UpdateEventInput = baseInput;
        if (trimmedDescription) {
          input.description = trimmedDescription;
        }
        if (trimmedLocation) {
          input.location = trimmedLocation;
        }
        onSave(input, event?.eventId, event?.version);
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    isAllDay,
    location,
    color,
    recurrence,
    event,
    onSave,
    onSaveRecurring,
    onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (event && onDelete && window.confirm('Delete this event?')) {
      onDelete(event.eventId);
      onClose();
    }
  }, [event, onDelete, onClose]);

  if (!isOpen) return null;

  const isEditing = !!event;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-[fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-surface border border-visible rounded-md shadow-[0_4px_24px_rgba(0,0,0,0.3)] animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-primary m-0">{isEditing ? 'Edit Event' : 'New Event'}</h2>
          <button
            className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-sm text-secondary cursor-pointer transition-all duration-fast hover:text-primary hover:bg-elevated"
            onClick={onClose}
            title="Close (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label htmlFor="event-title" className="text-sm font-medium text-secondary">Title</label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              autoFocus
              className="w-full py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
            />
          </div>

          {/* All-day toggle */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-primary">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span>All-day event</span>
            </label>
          </div>

          {/* Floating time toggle */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-primary">
              <input
                type="checkbox"
                checked={isFloatingTime}
                onChange={(e) => setIsFloatingTime(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span>Floating time</span>
            </label>
            <span className="block text-xs text-muted ml-6">
              Shows at same local time in any timezone (e.g., birthdays)
            </span>
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="start-date" className="text-sm font-medium text-secondary">Start</label>
              <div className="flex gap-2">
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
                />
                {!isAllDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-[100px] py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="end-date" className="text-sm font-medium text-secondary">End</label>
              <div className="flex gap-2">
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
                />
                {!isAllDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-[100px] py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label htmlFor="event-location" className="text-sm font-medium text-secondary">Location</label>
            <input
              id="event-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
            />
          </div>

          {/* Recurrence - only show for new events */}
          {!event && (
            <div className="flex flex-col gap-2">
              <label htmlFor="event-recurrence" className="text-sm font-medium text-secondary">Repeat</label>
              <select
                id="event-recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base transition-colors duration-fast focus:outline-none focus:border-accent"
              >
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show recurrence info for existing recurring events */}
          {event && (event.entityType === 'MASTER' || event.entityType === 'INSTANCE') && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-secondary">Repeat</label>
              <div className="flex items-center">
                <span className="inline-flex items-center py-1 px-2 bg-elevated rounded-sm text-secondary text-sm">
                  {event.rrule?.includes('DAILY') && 'Repeats daily'}
                  {event.rrule?.includes('WEEKLY') && 'Repeats weekly'}
                  {event.rrule?.includes('MONTHLY') && 'Repeats monthly'}
                  {event.rrule?.includes('YEARLY') && 'Repeats yearly'}
                  {!event.rrule && event.entityType === 'INSTANCE' && 'Part of recurring series'}
                </span>
              </div>
            </div>
          )}

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-secondary">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`w-7 h-7 border-2 rounded-sm cursor-pointer transition-all duration-fast hover:scale-110 ${color === c.value ? 'border-primary shadow-[0_0_0_2px_var(--bg-surface)]' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label htmlFor="event-description" className="text-sm font-medium text-secondary">Notes</label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes"
              rows={3}
              className="w-full py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base resize-y min-h-[80px] transition-colors duration-fast focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-subtle">
          {isEditing && onDelete && (
            <button
              className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-transparent border border-visible text-secondary hover:bg-elevated hover:text-primary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-accent border-none text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={!title.trim() || !startDate || isSaving}
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
