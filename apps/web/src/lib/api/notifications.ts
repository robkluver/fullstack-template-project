/**
 * Notifications API Client
 * Handles notification CRUD operations.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { api } from './client';
import type { Notification, NotificationStatus, NotificationListResponse } from '@nexus/shared';

/**
 * Get all notifications for a user (with unread count)
 */
export async function getNotifications(
  userId: string,
  options?: { limit?: number; year?: number }
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.year) params.set('year', String(options.year));

  const query = params.toString();
  const endpoint = `/users/${userId}/notifications${query ? `?${query}` : ''}`;

  return api.get<NotificationListResponse>(endpoint);
}

/**
 * Get a single notification by ID
 */
export async function getNotification(
  userId: string,
  notificationId: string
): Promise<Notification> {
  return api.get<Notification>(`/users/${userId}/notifications/${notificationId}`);
}

/**
 * Update notification status (mark as read or dismissed)
 */
export async function updateNotificationStatus(
  userId: string,
  notificationId: string,
  status: NotificationStatus,
  version: number
): Promise<Notification> {
  return api.patch<Notification>(
    `/users/${userId}/notifications/${notificationId}`,
    { status },
    version
  );
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<void> {
  await api.delete<void>(`/users/${userId}/notifications/${notificationId}`);
}
