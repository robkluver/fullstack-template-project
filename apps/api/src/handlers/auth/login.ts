import 'reflect-metadata';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { LoginRequestSchema } from '@nexus/shared';

export const handler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  try {
    const body: unknown = JSON.parse(event.body ?? '{}');
    const validated = LoginRequestSchema.parse(body);

    // TODO: Implement actual authentication
    // This is a placeholder response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          token: 'placeholder-token',
          user: {
            id: 'user-123',
            email: validated.email,
            name: 'Test User',
          },
        },
        error: null,
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Invalid request',
        },
      }),
    };
  }
};
