/**
 * API Response Helpers
 *
 * Standardized response formatting and error handling.
 *
 * @see docs/backend/CODING_STANDARDS_BACKEND.md
 */

import type { APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './errors.js';

const corsHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
});

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({
      data,
      error: null,
    }),
  };
}

/**
 * Error response
 */
export function errorResponse(
  statusCode: number,
  code: string,
  message: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({
      data: null,
      error: { code, message },
    }),
  };
}

/**
 * Handle API errors with centralized logic
 */
export function handleApiError(error: unknown): APIGatewayProxyResult {
  console.error('API Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    }

    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details,
        },
      }),
    };
  }

  // Handle typed AppErrors
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      headers: corsHeaders(),
      body: JSON.stringify({
        data: null,
        error: error.toJSON(),
      }),
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return errorResponse(500, 'INTERNAL_ERROR', error.message);
  }

  return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
