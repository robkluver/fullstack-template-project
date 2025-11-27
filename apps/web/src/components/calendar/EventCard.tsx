'use client';

/**
 * Event Card
 * Displays a calendar event as a colored card.
 *
 * @see docs/PRODUCT_VISION.md - Section 1.2 Event Properties
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.3 Cards
 */

import { type CalendarEvent } from '@/lib/api';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (event: CalendarEvent) => void;
  resizable?: boolean;
  onResizeStart?: (event: CalendarEvent) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Convert hex color to rgba with specified opacity
 * Makes event colors darker/more subtle in dark mode
 */
export function hexToRgba(hex: string, alpha: number = 0.5): string {
  // Handle CSS variables - return as-is with opacity wrapper
  if (hex.startsWith('var(')) {
    return hex;
  }
  // Handle rgb/rgba - just return as-is
  if (hex.startsWith('rgb')) {
    return hex;
  }
  // Convert hex to rgba
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function EventCard({ event, onClick, compact = false, draggable = false, onDragStart, resizable = false, onResizeStart }: EventCardProps) {
  const bgColor = hexToRgba(event.color || '#3b82f6', 0.5);
  const isRecurring = event.entityType === 'MASTER' || event.entityType === 'INSTANCE';
  const isTentative = event.status === 'TENTATIVE';
  const isCancelled = event.status === 'CANCELLED';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(event);
  };

  const handleResizeDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/json', JSON.stringify({ ...event, _resize: true }));
    e.dataTransfer.effectAllowed = 'move';
    onResizeStart?.(event);
  };

  // Build class names
  const cardClasses = [
    'relative h-full min-h-6 py-1 px-2 rounded-sm cursor-pointer overflow-hidden transition-all duration-fast text-white text-sm',
    'hover:scale-[1.02] hover:shadow-lg',
    draggable && 'cursor-grab active:cursor-grabbing active:opacity-80',
    compact && '!py-0.5 !px-1',
    isTentative && 'opacity-70 border-2 border-dashed border-white/50',
    isCancelled && 'opacity-50 line-through',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      style={{ backgroundColor: bgColor }}
      onClick={onClick}
      title={`${event.title}${event.location ? ` - ${event.location}` : ''}`}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
    >
      <div className="flex flex-col gap-0.5">
        <div className={`font-medium whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1 ${compact ? 'text-xs' : ''}`}>
          {isRecurring && <span className="text-xs opacity-80" title="Recurring">↻</span>}
          {event.title}
        </div>
        {!compact && event.startUtc && (
          <div className="text-xs opacity-90">
            {formatTime(event.startUtc)}
            {event.endUtc && ` - ${formatTime(event.endUtc)}`}
          </div>
        )}
        {!compact && event.location && (
          <div className="text-xs opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">
            {event.location}
          </div>
        )}
      </div>

      {/* Resize handle */}
      {resizable && !compact && (
        <div
          className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize bg-gradient-to-b from-transparent to-black/20 rounded-b-sm hover:to-black/40 active:bg-black/30"
          draggable
          onDragStart={handleResizeDragStart}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
