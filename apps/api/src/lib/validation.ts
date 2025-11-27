/**
 * Zod Validation Schemas
 *
 * Contract validation schemas for handler inputs.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md#2-lambda-handler-pattern
 */

import { z } from 'zod';

/**
 * Google OAuth callback request schema
 */
export const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

export type GoogleCallbackInput = z.infer<typeof googleCallbackSchema>;

/**
 * User ID path parameter schema
 */
export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
