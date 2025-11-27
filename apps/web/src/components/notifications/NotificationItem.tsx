'use client';

/**
 * NotificationItem Component
 * Single notification item in the dropdown.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { useState } from 'react';
import { useNotificationsStore } from '@/stores';
import type { Notification } from '@nexus/shared';
import { ImportResultsModal } from './ImportResultsModal';

// Icons
function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2C6 2 4.5 3.5 4.5 5.5V9L3 11V12H13V11L11.5 9V5.5C11.5 3.5 10 2 8 2Z" />
      <path d="M6.5 12V12.5C6.5 13.3 7.2 14 8 14C8.8 14 9.5 13.3 9.5 12.5V12" />
    </svg>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4L5 6L9 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10L5 12L9 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4H14" strokeLinecap="round" />
      <path d="M11 10H14" strokeLinecap="round" />
    </svg>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5V8.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.5" fill="currentColor" />
    </svg>
  );
}

function DismissIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3L11 11M11 3L3 11" strokeLinecap="round" />
    </svg>
  );
}

interface NotificationItemProps {
  notification: Notification;
  userId: string;
}

export function NotificationItem({ notification, userId }: NotificationItemProps) {
  const [showModal, setShowModal] = useState(false);
  const { markAsRead, markAsDismissed } = useNotificationsStore();

  const isUnread = notification.status === 'UNREAD';

  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case 'GOOGLE_IMPORT':
        return <GoogleCalendarIcon className="text-blue-500" />;
      case 'REMINDER_DUE':
        return <BellIcon className="text-orange-500" />;
      case 'TASK_OVERDUE':
        return <TaskIcon className="text-red-500" />;
      default:
        return <SystemIcon className="text-muted" />;
    }
  };

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleClick = async () => {
    // Mark as read if unread
    if (isUnread) {
      await markAsRead(userId, notification.notificationId, notification.version);
    }

    // Show modal for import results
    if (notification.type === 'GOOGLE_IMPORT') {
      setShowModal(true);
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsDismissed(userId, notification.notificationId, notification.version);
  };

  return (
    <>
      <div
        role="menuitem"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-subtle last:border-b-0 transition-colors hover:bg-elevated ${
          isUnread ? 'bg-blue-500/5' : ''
        }`}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-elevated">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm truncate ${
                isUnread ? 'font-medium text-primary' : 'text-secondary'
              }`}
            >
              {notification.title}
            </p>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-muted hover:text-secondary hover:bg-elevated rounded transition-colors"
              title="Dismiss"
              aria-label="Dismiss notification"
            >
              <DismissIcon />
            </button>
          </div>

          {notification.message && (
            <p className="text-xs text-muted truncate mt-0.5">
              {notification.message}
            </p>
          )}

          <p className="text-xs text-muted mt-1">
            {formatTime(notification.createdAt)}
          </p>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-accent" />
        )}
      </div>

      {/* Import Results Modal */}
      {showModal && notification.type === 'GOOGLE_IMPORT' && (
        <ImportResultsModal
          notification={notification}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
