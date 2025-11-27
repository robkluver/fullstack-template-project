import type { APIGatewayProxyResult } from 'aws-lambda';

export const handler = (): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      error: null,
    }),
  };
};
