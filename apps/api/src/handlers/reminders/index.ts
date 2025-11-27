/**
 * Reminder handlers exports
 *
 * @see docs/backend/dynamodb-spec/05-PHASE3-REMINDERS.md
 */

export { handler as createReminder } from './createReminder.js';
export { handler as getReminders } from './getReminders.js';
export { handler as getReminder } from './getReminder.js';
export { handler as updateReminder } from './updateReminder.js';
export { handler as deleteReminder } from './deleteReminder.js';
