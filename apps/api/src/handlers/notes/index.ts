/**
 * Notes handlers index
 *
 * @see docs/backend/dynamodb-spec/06-PHASE4-NOTES.md
 */

export { handler as createNote } from './createNote.js';
export { handler as getNotes } from './getNotes.js';
export { handler as getNote } from './getNote.js';
export { handler as updateNote } from './updateNote.js';
export { handler as deleteNote } from './deleteNote.js';
