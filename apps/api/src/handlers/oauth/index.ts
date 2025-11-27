/**
 * OAuth Handlers Index
 *
 * Re-exports all OAuth handlers for cleaner imports.
 */

export { handler as tokenHandler } from './token.js';
export { handler as revokeHandler } from './revoke.js';
export { handler as userinfoHandler } from './userinfo.js';
