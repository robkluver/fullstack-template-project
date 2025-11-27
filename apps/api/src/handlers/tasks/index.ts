/**
 * Task handlers exports
 *
 * @see docs/backend/dynamodb-spec/04-PHASE2-TASKS.md
 */

export { handler as createTask } from './createTask.js';
export { handler as getTasks } from './getTasks.js';
export { handler as getTask } from './getTask.js';
export { handler as updateTask } from './updateTask.js';
export { handler as deleteTask } from './deleteTask.js';
