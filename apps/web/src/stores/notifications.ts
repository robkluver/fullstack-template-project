/**
 * Notifications Store
 * Manages notification state with persistence and API sync.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@nexus/shared';
import { notificationsApi } from '@/lib/api';

interface NotificationsState {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isDropdownOpen: boolean;
  selectedNotification: Notification | null;

  // Actions
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (userId: string, notificationId: string, version: number) => Promise<void>;
  markAsDismissed: (userId: string, notificationId: string, version: number) => Promise<void>;
  deleteNotification: (userId: string, notificationId: string) => Promise<void>;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
  selectNotification: (notification: Notification | null) => void;
  clearError: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      isDropdownOpen: false,
      selectedNotification: null,

      // Fetch notifications from API
      fetchNotifications: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await notificationsApi.getNotifications(userId, { limit: 50 });
          set({
            notifications: response.notifications,
            unreadCount: response.unreadCount,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch notifications',
            isLoading: false,
          });
        }
      },

      // Mark notification as read
      markAsRead: async (userId: string, notificationId: string, version: number) => {
        try {
          const updated = await notificationsApi.updateNotificationStatus(
            userId,
            notificationId,
            'READ',
            version
          );

          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.notificationId === notificationId ? updated : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to mark as read',
          });
        }
      },

      // Mark notification as dismissed
      markAsDismissed: async (userId: string, notificationId: string, version: number) => {
        try {
          const updated = await notificationsApi.updateNotificationStatus(
            userId,
            notificationId,
            'DISMISSED',
            version
          );

          set((state) => {
            const wasUnread = state.notifications.find(
              (n) => n.notificationId === notificationId
            )?.status === 'UNREAD';

            return {
              notifications: state.notifications.map((n) =>
                n.notificationId === notificationId ? updated : n
              ),
              unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            };
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to dismiss notification',
          });
        }
      },

      // Delete notification
      deleteNotification: async (userId: string, notificationId: string) => {
        try {
          await notificationsApi.deleteNotification(userId, notificationId);

          set((state) => {
            const wasUnread = state.notifications.find(
              (n) => n.notificationId === notificationId
            )?.status === 'UNREAD';

            return {
              notifications: state.notifications.filter(
                (n) => n.notificationId !== notificationId
              ),
              unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
              selectedNotification:
                state.selectedNotification?.notificationId === notificationId
                  ? null
                  : state.selectedNotification,
            };
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to delete notification',
          });
        }
      },

      // Dropdown controls
      openDropdown: () => set({ isDropdownOpen: true }),
      closeDropdown: () => set({ isDropdownOpen: false }),
      toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),

      // Selection
      selectNotification: (notification: Notification | null) =>
        set({ selectedNotification: notification }),

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'nexus-notifications',
      partialize: (state) => ({
        // Only persist unreadCount for badge display before fetch completes
        unreadCount: state.unreadCount,
      }),
    }
  )
);
