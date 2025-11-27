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

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AccessTokenPayload {
  sub: string;      // User ID
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;      // User ID
  jti: string;      // Unique ID for revocation
  iat: number;
  exp: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  email_verified?: boolean;
}

// Notification types
export type NotificationType = 'GOOGLE_IMPORT' | 'REMINDER_DUE' | 'TASK_OVERDUE' | 'SYSTEM';
export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED';

export interface Notification {
  notificationId: string;
  type: NotificationType;
  title: string;
  message?: string | undefined;
  status: NotificationStatus;
  metadata?: GoogleImportMetadata | ReminderDueMetadata | TaskOverdueMetadata | Record<string, unknown> | undefined;
  readAt?: string | undefined;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleImportMetadata {
  imported: number;
  skipped: number;
  conflicts: GoogleImportConflict[];
}

export interface GoogleImportConflict {
  eventId: string;
  title: string;
  localUpdatedAt: string;
  googleUpdatedAt: string;
}

export interface ReminderDueMetadata {
  reminderId: string;
  eventId?: string;
  title: string;
}

export interface TaskOverdueMetadata {
  taskId: string;
  title: string;
  dueUtc: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

// Google OAuth types
export interface GoogleOAuthStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface GoogleImportResult {
  imported: number;
  skipped: number;
  conflicts: GoogleImportConflict[];
  notificationId: string;
}
