// API Response envelope
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  timestamp?: string;
}

// Add your entity types here
// Example:
// export interface User {
//   id: string;
//   email: string;
//   name: string;
//   createdAt: string;
//   updatedAt: string;
// }
