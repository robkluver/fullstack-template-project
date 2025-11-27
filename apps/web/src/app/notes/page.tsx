'use client';

/**
 * Notes Page
 * Grid or list view of notes with Markdown support.
 *
 * @see docs/PRODUCT_VISION.md - Section 4 Notes
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores';
import {
  notesApi,
  type Note,
  type CreateNoteInput,
  type UpdateNoteInput,
  type NotesResponse,
} from '@/lib/api';
import { NoteCard, NoteModal } from '@/components/notes';

type NotesView = 'grid' | 'list';

export default function NotesPage() {
  const queryClient = useQueryClient();
  const setActiveNavItem = useUIStore((state) => state.setActiveNavItem);
  const [view, setView] = useState<NotesView>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');

  useEffect(() => {
    setActiveNavItem('notes');
  }, [setActiveNavItem]);

  // Fetch notes
  const { data, isLoading, error } = useQuery({
    queryKey: ['notes', showArchived, tagFilter],
    queryFn: () => {
      const options: { year?: string; includeArchived?: boolean; tag?: string } = {
        includeArchived: showArchived,
      };
      if (tagFilter) {
        options.tag = tagFilter;
      }
      return notesApi.getNotes(options);
    },
  });

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: notesApi.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: ({
      noteId,
      input,
      version,
    }: {
      noteId: string;
      input: UpdateNoteInput;
      version: number;
    }) => notesApi.updateNote(noteId, input, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => notesApi.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: ({ noteId, version }: { noteId: string; version: number }) =>
      notesApi.archive(noteId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Toggle pin mutation with optimistic update
  const togglePinMutation = useMutation({
    mutationFn: ({
      noteId,
      isPinned,
      version,
    }: {
      noteId: string;
      isPinned: boolean;
      version: number;
    }) => notesApi.togglePin(noteId, isPinned, version),
    onMutate: async ({ noteId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previousData = queryClient.getQueryData<NotesResponse>([
        'notes',
        showArchived,
        tagFilter,
      ]);
      if (previousData) {
        queryClient.setQueryData<NotesResponse>(
          ['notes', showArchived, tagFilter],
          {
            ...previousData,
            notes: previousData.notes.map((n) =>
              n.noteId === noteId ? { ...n, isPinned } : n
            ),
          }
        );
      }
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['notes', showArchived, tagFilter],
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Handlers
  const handleCreateNote = useCallback(
    (input: CreateNoteInput) => {
      createMutation.mutate(input);
    },
    [createMutation]
  );

  const handleUpdateNote = useCallback(
    (noteId: string, input: UpdateNoteInput, version: number) => {
      updateMutation.mutate({ noteId, input, version });
    },
    [updateMutation]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteMutation.mutate(noteId);
    },
    [deleteMutation]
  );

  const handleArchiveNote = useCallback(
    (noteId: string, version: number) => {
      archiveMutation.mutate({ noteId, version });
    },
    [archiveMutation]
  );

  const handleTogglePin = useCallback(
    (noteId: string, isPinned: boolean) => {
      const note = data?.notes.find((n) => n.noteId === noteId);
      if (note) {
        togglePinMutation.mutate({ noteId, isPinned, version: note.version });
      }
    },
    [data?.notes, togglePinMutation]
  );

  const handleNoteClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setModalOpen(true);
  }, []);

  const handleNewNote = useCallback(() => {
    setSelectedNote(null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedNote(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+N = New note
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewNote]);

  // Get all unique tags from notes
  const allTags = Array.from(
    new Set(data?.notes.flatMap((n) => n.tags || []) || [])
  ).sort();

  const notes = data?.notes || [];

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-primary m-0">Notes</h1>
            <span className="text-sm text-secondary">{data?.meta.total || 0} notes</span>
          </div>
          <div className="flex items-center gap-3">
            {allTags.length > 0 && (
              <select
                className="py-1 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary cursor-pointer"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
            <div className="flex gap-1 bg-elevated p-1 rounded-sm">
              <button
                className={`p-1 px-2 bg-transparent border-none rounded-sm text-secondary cursor-pointer transition-all duration-fast flex items-center justify-center ${view === 'grid' ? 'text-primary bg-surface' : 'hover:text-primary hover:bg-base'}`}
                onClick={() => setView('grid')}
                title="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                </svg>
              </button>
              <button
                className={`p-1 px-2 bg-transparent border-none rounded-sm text-secondary cursor-pointer transition-all duration-fast flex items-center justify-center ${view === 'list' ? 'text-primary bg-surface' : 'hover:text-primary hover:bg-base'}`}
                onClick={() => setView('list')}
                title="List view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                </svg>
              </button>
            </div>
            <button
              className="flex items-center gap-2 py-2 px-4 bg-accent border-none rounded-sm text-white text-sm font-medium cursor-pointer transition-opacity duration-fast hover:opacity-90"
              onClick={handleNewNote}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
              </svg>
              New Note
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-secondary">
            <div className="w-8 h-8 border-3 border-subtle border-t-accent rounded-full animate-spin" />
            <p>Loading notes...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-secondary">
            <p>Failed to load notes. Please try again.</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-center p-6 bg-elevated border border-subtle rounded-md">
            <div className="text-muted mb-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="8" y="4" width="32" height="40" rx="2" />
                <path d="M16 14H32" strokeLinecap="round" />
                <path d="M16 22H32" strokeLinecap="round" />
                <path d="M16 30H24" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg text-primary m-0 mb-2">No notes yet</h2>
            <p className="text-muted m-0">
              Press <kbd className="inline-flex py-0.5 px-1.5 font-mono text-xs bg-base border border-subtle rounded-sm">Cmd+Shift+N</kbd> or click New Note to create one.
            </p>
            <button
              className="mt-4 py-2 px-4 bg-accent border-none rounded-sm text-white text-sm font-medium cursor-pointer transition-opacity duration-fast hover:opacity-90"
              onClick={handleNewNote}
            >
              Create your first note
            </button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4' : 'flex flex-col gap-2'}>
            {notes.map((note) => (
              <NoteCard
                key={note.noteId}
                note={note}
                variant={view}
                onClick={() => handleNoteClick(note)}
                onPin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </main>

      <NoteModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        note={selectedNote}
        onSave={handleCreateNote}
        onUpdate={handleUpdateNote}
        onDelete={handleDeleteNote}
        onArchive={handleArchiveNote}
      />
    </div>
  );
}
