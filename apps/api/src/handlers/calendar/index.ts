/**
 * Calendar Handlers Index
 *
 * Re-exports all calendar handlers for cleaner imports.
 */

export { handler as getAgendaHandler } from './getAgenda.js';
export { handler as getEventHandler } from './getEvent.js';
export { handler as createEventHandler } from './createEvent.js';
export { handler as updateEventHandler } from './updateEvent.js';
export { handler as deleteEventHandler } from './deleteEvent.js';

// Recurring event handlers
export { handler as createRecurringHandler } from './createRecurring.js';
export { handler as getSeriesHandler } from './getSeries.js';
export { handler as endSeriesHandler } from './endSeries.js';
