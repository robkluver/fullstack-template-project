'use client';

/**
 * Quick Add Component
 * Inline event creation on double-click.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.1 Calendar Views
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface QuickAddProps {
  date: Date;
  hour: number;
  onSave: (title: string, date: Date, hour: number) => void;
  onCancel: () => void;
}

export function QuickAdd({ date, hour, onSave, onCancel }: QuickAddProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && title.trim()) {
        e.preventDefault();
        onSave(title.trim(), date, hour);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [title, date, hour, onSave, onCancel]
  );

  // Handle blur - save if has content, cancel if empty
  const handleBlur = useCallback(() => {
    if (title.trim()) {
      onSave(title.trim(), date, hour);
    } else {
      onCancel();
    }
  }, [title, date, hour, onSave, onCancel]);

  // Format time display
  const timeLabel = hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;

  return (
    <div className="absolute left-0.5 right-0.5 bg-surface border-2 border-accent rounded-sm p-2 z-20 shadow-lg">
      <div className="text-xs text-muted mb-1">{timeLabel}</div>
      <input
        ref={inputRef}
        type="text"
        className="w-full border-none bg-transparent text-sm text-primary outline-none p-0 placeholder:text-muted"
        placeholder="Add event title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <div className="flex items-center gap-1 mt-2 text-xs text-muted">
        <kbd className="inline-flex items-center justify-center py-0.5 px-1 font-mono text-[10px] bg-elevated border border-visible rounded">Enter</kbd>
        <span>to save,</span>
        <kbd className="inline-flex items-center justify-center py-0.5 px-1 font-mono text-[10px] bg-elevated border border-visible rounded">Esc</kbd>
        <span>to cancel</span>
      </div>
    </div>
  );
}
