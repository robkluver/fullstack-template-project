'use client';

/**
 * Reminder Card
 * Displays a reminder with snooze/complete actions.
 *
 * @see docs/PRODUCT_VISION.md - Section 3 Reminders
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.3 Cards
 */

import { type Reminder, SNOOZE_OPTIONS } from '@/lib/api';

interface ReminderCardProps {
  reminder: Reminder;
  onClick?: () => void;
  onSnooze?: (option: string) => void;
  onComplete?: () => void;
  onDismiss?: () => void;
}

// Format relative time
function formatTriggerTime(triggerUtc: string, snoozedUntil?: string | null): { text: string; isPast: boolean; isSoon: boolean } {
  const targetTime = snoozedUntil || triggerUtc;
  const target = new Date(targetTime);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const isPast = diffMs < 0;

  if (isPast) {
    const mins = Math.ceil(Math.abs(diffMs) / (60 * 1000));
    if (mins < 60) return { text: `${mins}m ago`, isPast: true, isSoon: false };
    const hours = Math.floor(mins / 60);
    if (hours < 24) return { text: `${hours}h ago`, isPast: true, isSoon: false };
    return { text: target.toLocaleDateString(), isPast: true, isSoon: false };
  }

  const mins = Math.floor(diffMs / (60 * 1000));
  if (mins < 60) return { text: `in ${mins}m`, isPast: false, isSoon: true };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `in ${hours}h`, isPast: false, isSoon: hours < 2 };

  // More than 24 hours away
  const isSoon = diffMs < 30 * 60 * 1000; // Within 30 minutes
  return {
    text: target.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    isPast: false,
    isSoon,
  };
}

export function ReminderCard({
  reminder,
  onClick,
  onSnooze,
  onComplete,
  onDismiss,
}: ReminderCardProps) {
  const color = reminder.color || '#f59e0b';
  const isCompleted = reminder.status === 'COMPLETED' || reminder.status === 'DISMISSED';
  const isSnoozed = reminder.status === 'SNOOZED';
  const timeInfo = formatTriggerTime(reminder.triggerUtc, reminder.snoozedUntil);

  // Build class names
  const cardClasses = [
    'relative p-3 pl-4 bg-surface rounded-md border-l-[3px] cursor-pointer transition-all duration-fast',
    'hover:shadow-lg',
    isCompleted && 'opacity-60',
    isSnoozed && 'opacity-80',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">🔔</span>
          <span
            className={`text-xs text-secondary flex items-center gap-2 ${timeInfo.isPast ? '!text-red-500 font-medium' : ''} ${timeInfo.isSoon ? '!text-orange-500 font-medium' : ''}`}
          >
            {timeInfo.text}
            {isSnoozed && <span className="py-px px-1.5 bg-elevated rounded-sm text-[10px]">Snoozed</span>}
          </span>
        </div>
        <div className={`text-sm font-medium text-primary ${isCompleted ? 'line-through' : ''}`}>
          {reminder.title}
        </div>
        {reminder.note && (
          <div className="text-xs text-secondary whitespace-nowrap overflow-hidden text-ellipsis">
            {reminder.note.slice(0, 100)}{reminder.note.length > 100 ? '...' : ''}
          </div>
        )}
      </div>

      {!isCompleted && (
        <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          <button
            className="py-1 px-2 bg-elevated border-none rounded-sm text-xs cursor-pointer transition-all duration-fast hover:bg-green-500 hover:text-white"
            onClick={onComplete}
            title="Complete"
          >
            ✓
          </button>
          <div className="relative group">
            <button className="py-1 px-2 bg-elevated border-none rounded-sm text-xs cursor-pointer transition-all duration-fast hover:bg-elevated" title="Snooze">
              ⏰
            </button>
            <div className="hidden group-hover:block absolute top-full left-0 z-10 min-w-[120px] bg-surface border border-visible rounded-sm shadow-xl p-1">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className="block w-full p-2 bg-transparent border-none text-left text-xs text-primary cursor-pointer rounded-sm hover:bg-elevated"
                  onClick={() => onSnooze?.(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            className="py-1 px-2 bg-elevated border-none rounded-sm text-xs cursor-pointer transition-all duration-fast hover:bg-red-500 hover:text-white"
            onClick={onDismiss}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
