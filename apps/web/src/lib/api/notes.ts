/**
 * Notes API
 * Endpoints for note management.
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md
 * @see docs/backend/dynamodb-spec/08-REST-API.md
 */

import { api } from './client';

// Note status values
export type NoteStatus = 'ACTIVE' | 'ARCHIVED';

// Note entity type
export interface Note {
  noteId: string;
  title: string;
  body?: string;
  slug?: string;
  color?: string;
  isPinned: boolean;
  tags?: string[];
  links?: NoteLink[];
  status: NoteStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Link to another entity
export interface NoteLink {
  type: 'TASK' | 'EVENT' | 'REMINDER' | 'NOTE';
  id: string;
  title: string;
}

// Notes list response
export interface NotesResponse {
  notes: Note[];
  meta: {
    year: string;
    total: number;
    includeArchived: boolean;
  };
}

// Create note input
export interface CreateNoteInput {
  title: string;
  body?: string;
  color?: string;
  isPinned?: boolean;
  tags?: string[];
}

// Update note input
export interface UpdateNoteInput {
  title?: string;
  body?: string | null;
  color?: string | null;
  isPinned?: boolean;
  tags?: string[] | null;
  status?: NoteStatus;
}

// Note creation response
export interface CreateNoteResponse {
  noteId: string;
  title: string;
  slug: string;
  status: NoteStatus;
  isPinned: boolean;
  version: number;
  createdAt: string;
}

// Note update response
export interface UpdateNoteResponse {
  noteId: string;
  title: string;
  slug: string;
  status: NoteStatus;
  isPinned: boolean;
  version: number;
  updatedAt: string;
}

// Default note colors
export const NOTE_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#6b7280', label: 'Gray' },
] as const;

// User ID - in a real app, this would come from auth context
const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('nexus_user_id') || 'demo_user';
  }
  return 'demo_user';
};

export const notesApi = {
  /**
   * Get all notes for a year
   * AP23: Get All Notes
   */
  getNotes: (options?: {
    year?: string;
    includeArchived?: boolean;
    tag?: string;
  }): Promise<NotesResponse> => {
    const params = new URLSearchParams();
    if (options?.year) params.set('year', options.year);
    if (options?.includeArchived) params.set('includeArchived', 'true');
    if (options?.tag) params.set('tag', options.tag);
    const query = params.toString() ? `?${params.toString()}` : '';
    return api.get<NotesResponse>(`/users/${getUserId()}/notes${query}`);
  },

  /**
   * Get single note
   * AP24: Get Single Note
   */
  getNote: (noteId: string): Promise<Note> => {
    return api.get<Note>(`/users/${getUserId()}/notes/${noteId}`);
  },

  /**
   * Create new note
   * AP25: Create Note
   */
  createNote: (input: CreateNoteInput): Promise<CreateNoteResponse> => {
    return api.post<CreateNoteResponse>(`/users/${getUserId()}/notes`, input);
  },

  /**
   * Update note
   * AP26: Update Note
   */
  updateNote: (
    noteId: string,
    input: UpdateNoteInput,
    version: number
  ): Promise<UpdateNoteResponse> => {
    return api.patch<UpdateNoteResponse>(
      `/users/${getUserId()}/notes/${noteId}`,
      input,
      version
    );
  },

  /**
   * Delete note (soft delete by default)
   * AP28: Archive/Delete Note
   */
  deleteNote: (noteId: string, hard = false): Promise<void> => {
    const query = hard ? '?hard=true' : '';
    return api.delete<void>(`/users/${getUserId()}/notes/${noteId}${query}`);
  },

  /**
   * Pin/unpin note (convenience method)
   */
  togglePin: (
    noteId: string,
    isPinned: boolean,
    version: number
  ): Promise<UpdateNoteResponse> => {
    return api.patch<UpdateNoteResponse>(
      `/users/${getUserId()}/notes/${noteId}`,
      { isPinned },
      version
    );
  },

  /**
   * Archive note (convenience method)
   */
  archive: (noteId: string, version: number): Promise<UpdateNoteResponse> => {
    return api.patch<UpdateNoteResponse>(
      `/users/${getUserId()}/notes/${noteId}`,
      { status: 'ARCHIVED' },
      version
    );
  },

  /**
   * Restore note from archive (convenience method)
   */
  restore: (noteId: string, version: number): Promise<UpdateNoteResponse> => {
    return api.patch<UpdateNoteResponse>(
      `/users/${getUserId()}/notes/${noteId}`,
      { status: 'ACTIVE' },
      version
    );
  },
};
