/**
 * Notification Repository Interface
 *
 * Data contract for notification storage operations.
 */

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationRepository {
  /**
   * Create a new notification
   */
  create(input: CreateNotificationInput): Promise<Notification>;

  /**
   * Get a notification by ID
   */
  findById(userId: string, notificationId: string): Promise<Notification | null>;

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): Promise<void>;

  /**
   * Delete a notification
   */
  delete(userId: string, notificationId: string): Promise<void>;
}
