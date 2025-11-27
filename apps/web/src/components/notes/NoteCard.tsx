'use client';

/**
 * Note Card Component
 * Displays a note in grid or list view.
 *
 * @see docs/PRODUCT_VISION.md - Section 4 Notes
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 5.3 Cards
 */

import { type Note } from '@/lib/api';
import { hexToRgba } from '../calendar/EventCard';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
  onPin?: (noteId: string, isPinned: boolean) => void;
  variant?: 'grid' | 'list';
}

// Truncate text helper
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

export function NoteCard({ note, onClick, onPin, variant = 'grid' }: NoteCardProps) {
  const bgColor = hexToRgba(note.color || '#3b82f6', 0.5);
  // Always use white text with 50% alpha backgrounds for consistent contrast
  const textColor = 'rgba(255, 255, 255, 0.95)';
  const secondaryColor = 'rgba(255, 255, 255, 0.7)';

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPin?.(note.noteId, !note.isPinned);
  };

  // Extract preview from body (strip markdown headers)
  const bodyPreview = note.body
    ? truncate(note.body.replace(/^#+\s+/gm, '').replace(/\n+/g, ' '), 150)
    : '';

  // Build class names based on variant
  const isGrid = variant === 'grid';
  const cardClasses = [
    'rounded-md p-4 cursor-pointer transition-all duration-fast relative',
    'hover:-translate-y-0.5 hover:shadow-xl',
    isGrid ? 'flex flex-col gap-2 min-h-[120px]' : 'flex flex-row items-center gap-4 py-3 px-4',
  ].join(' ');

  return (
    <div
      className={cardClasses}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      onClick={onClick}
    >
      <div className={`flex items-start justify-between gap-2 ${!isGrid ? 'flex-none w-[280px]' : ''}`}>
        <h3 className="m-0 text-base font-semibold leading-tight flex-1">
          {truncate(note.title, 60)}
        </h3>
        <button
          className={`flex-shrink-0 bg-transparent border-none cursor-pointer p-0.5 rounded transition-all duration-fast opacity-0 group-hover:opacity-100 hover:bg-white/15 ${note.isPinned ? 'opacity-100 rotate-45' : ''}`}
          style={{ color: note.isPinned ? textColor : secondaryColor }}
          onClick={handlePinClick}
          title={note.isPinned ? 'Unpin note' : 'Pin note'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5a.5.5 0 0 1-1 0V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/>
          </svg>
        </button>
      </div>

      {bodyPreview && (
        <p
          className={`m-0 text-sm leading-relaxed ${isGrid ? 'flex-1' : 'flex-1 overflow-hidden text-ellipsis whitespace-nowrap'}`}
          style={{ color: secondaryColor }}
        >
          {bodyPreview}
        </p>
      )}

      <div className={`flex items-center justify-between gap-2 ${isGrid ? 'mt-auto' : 'flex-none mt-0'}`}>
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] py-0.5 px-1.5 bg-white/20 rounded-sm" style={{ color: textColor }}>
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] py-0.5 px-1.5 bg-black/10 rounded-sm" style={{ color: textColor }}>
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
        <span className="text-xs whitespace-nowrap" style={{ color: secondaryColor }}>
          {formatDate(note.updatedAt)}
        </span>
      </div>
    </div>
  );
}
