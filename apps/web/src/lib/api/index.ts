/**
 * API exports
 */

export { api, ApiError } from './client';
export {
  calendarApi,
  type CalendarEvent,
  type AgendaDay,
  type AgendaResponse,
  type CreateEventInput,
  type UpdateEventInput,
  type CreateRecurringInput,
} from './calendar';
export {
  tasksApi,
  VALID_EFFORT,
  type Task,
  type TaskStatus,
  type EffortValue,
  type KanbanBoard,
  type CreateTaskInput,
  type UpdateTaskInput,
} from './tasks';
export {
  remindersApi,
  SNOOZE_OPTIONS,
  calculateSnoozeTime,
  type Reminder,
  type ReminderStatus,
  type RemindersResponse,
  type CreateReminderInput,
  type UpdateReminderInput,
} from './reminders';
export {
  notesApi,
  NOTE_COLORS,
  type Note,
  type NoteStatus,
  type NoteLink,
  type NotesResponse,
  type CreateNoteInput,
  type UpdateNoteInput,
} from './notes';
export {
  unifiedApi,
  getEntityIcon,
  formatTime,
  formatTimeRange,
  type UnifiedEntityType,
  type AgendaItem,
  type UnifiedAgendaDay,
  type UnifiedAgendaResponse,
} from './unified';
export * as notificationsApi from './notifications';
export * as googleCalendarApi from './google-calendar';
