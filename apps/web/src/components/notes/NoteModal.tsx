'use client';

/**
 * Note Modal
 * Modal for creating and editing notes with Markdown support.
 *
 * @see docs/PRODUCT_VISION.md - Section 4 Notes
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 9.2 Modals
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Note,
  type CreateNoteInput,
  type UpdateNoteInput,
  NOTE_COLORS,
} from '@/lib/api';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note?: Note | null;
  onSave: (input: CreateNoteInput) => void;
  onUpdate?: (noteId: string, input: UpdateNoteInput, version: number) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string, version: number) => void;
}

export function NoteModal({
  isOpen,
  onClose,
  note,
  onSave,
  onUpdate,
  onDelete,
  onArchive,
}: NoteModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const isEditing = !!note;

  // Reset form when modal opens/closes or note changes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title);
        setBody(note.body || '');
        setColor(note.color || '#3b82f6');
        setTags(note.tags?.join(', ') || '');
        setIsPinned(note.isPinned);
      } else {
        setTitle('');
        setBody('');
        setColor('#3b82f6');
        setTags('');
        setIsPinned(false);
      }
      setShowPreview(false);
      // Focus title input
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, note]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowPreview((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (isEditing && note && onUpdate) {
      const updates: UpdateNoteInput = {};
      if (title !== note.title) updates.title = title;
      if (body !== (note.body || '')) updates.body = body || null;
      if (color !== note.color) updates.color = color;
      if (isPinned !== note.isPinned) updates.isPinned = isPinned;
      const currentTags = note.tags?.join(', ') || '';
      if (tags !== currentTags) {
        updates.tags = parsedTags.length > 0 ? parsedTags : null;
      }

      if (Object.keys(updates).length > 0) {
        onUpdate(note.noteId, updates, note.version);
      }
    } else {
      const input: CreateNoteInput = {
        title: title.trim(),
        color,
        isPinned,
      };
      if (body) input.body = body;
      if (parsedTags.length > 0) input.tags = parsedTags;

      onSave(input);
    }

    onClose();
  }, [title, body, color, tags, isPinned, isEditing, note, onSave, onUpdate, onClose]);

  const handleDelete = useCallback(() => {
    if (note && onDelete && confirm('Delete this note permanently?')) {
      onDelete(note.noteId);
      onClose();
    }
  }, [note, onDelete, onClose]);

  const handleArchive = useCallback(() => {
    if (note && onArchive) {
      onArchive(note.noteId, note.version);
      onClose();
    }
  }, [note, onArchive, onClose]);

  // Simple markdown to HTML conversion for preview
  const renderMarkdown = (text: string): string => {
    return text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] max-h-[90vh] bg-surface rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="m-0 text-lg font-semibold text-primary">{isEditing ? 'Edit Note' : 'New Note'}</h2>
          <div className="flex items-center gap-2">
            <button
              className={`bg-transparent border-none text-secondary cursor-pointer p-1 rounded-sm transition-all duration-fast hover:text-accent hover:bg-elevated ${showPreview ? 'text-accent bg-elevated' : ''}`}
              onClick={() => setShowPreview((p) => !p)}
              title="Toggle preview (Cmd+P)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
              </svg>
            </button>
            <button
              className="bg-transparent border-none text-2xl text-secondary cursor-pointer p-0 leading-none hover:text-primary"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              maxLength={500}
              className="py-2 px-0 bg-transparent border-0 border-b-2 border-subtle text-xl font-semibold text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-h-[200px]">
            {showPreview ? (
              <div
                className="w-full min-h-[200px] p-3 bg-elevated border border-subtle rounded-sm text-sm text-primary overflow-y-auto [&_h1]:m-0 [&_h1]:mb-2 [&_h1]:font-semibold [&_h1]:text-xl [&_h2]:m-0 [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:text-lg [&_h3]:m-0 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-base [&_code]:bg-base [&_code]:py-0.5 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_li]:ml-4"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
              />
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your note... (Markdown supported)"
                maxLength={50000}
                className="w-full h-full min-h-[200px] p-3 bg-elevated border border-subtle rounded-sm text-sm font-mono text-primary resize-y focus:outline-none focus:border-accent"
              />
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="work, ideas, important"
                className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap text-sm font-medium text-secondary">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                Pin to top
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Color</label>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((opt) => (
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
          {isEditing && (
            <div className="flex gap-2">
              {onArchive && note?.status === 'ACTIVE' && (
                <button
                  className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-transparent border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white"
                  onClick={handleArchive}
                >
                  Archive
                </button>
              )}
              {onDelete && (
                <button
                  className="py-2 px-4 rounded-sm text-sm font-medium cursor-pointer transition-all duration-fast bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              )}
            </div>
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
              {isEditing ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
