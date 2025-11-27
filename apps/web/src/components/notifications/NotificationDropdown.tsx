'use client';

/**
 * NotificationDropdown Component
 * Dropdown menu showing list of notifications.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { useNotificationsStore } from '@/stores';
import { useAuth } from '@/lib/auth';
import { NotificationItem } from './NotificationItem';

export function NotificationDropdown() {
  const { userId } = useAuth();
  const { notifications, isLoading, error } = useNotificationsStore();

  // Filter out dismissed notifications for the dropdown
  const visibleNotifications = notifications.filter(
    (n) => n.status !== 'DISMISSED'
  );

  return (
    <div
      className="absolute left-full top-0 ml-2 w-80 max-h-[480px] bg-surface border border-subtle rounded-lg shadow-lg overflow-hidden z-50"
      role="menu"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
        <h3 className="text-sm font-semibold text-primary">Notifications</h3>
        {visibleNotifications.length > 0 && (
          <span className="text-xs text-muted">
            {visibleNotifications.filter((n) => n.status === 'UNREAD').length} unread
          </span>
        )}
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[400px]">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-muted border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!isLoading && !error && visibleNotifications.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted">No notifications</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          visibleNotifications.map((notification) => (
            <NotificationItem
              key={notification.notificationId}
              notification={notification}
              userId={userId || ''}
            />
          ))}
      </div>
    </div>
  );
}
