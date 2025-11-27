/**
 * API Client
 * HTTP client for backend API communication.
 *
 * @see docs/backend/dynamodb-spec/08-REST-API.md
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nexus_access_token');
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || json.error) {
    throw new ApiError(
      json.error?.code || 'UNKNOWN_ERROR',
      json.error?.message || 'An unexpected error occurred',
      response.status
    );
  }

  return json.data as T;
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown) => {
    const options: RequestInit = { method: 'POST' };
    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }
    return request<T>(endpoint, options);
  },

  patch: <T>(endpoint: string, data: unknown, version?: number) => {
    const headers: HeadersInit = {};
    if (version !== undefined) {
      headers['If-Match'] = String(version);
    }
    return request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers,
    });
  },

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError };
