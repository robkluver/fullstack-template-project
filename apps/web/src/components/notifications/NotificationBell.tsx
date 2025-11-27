'use client';

/**
 * NotificationBell Component
 * Bell icon with unread count badge and dropdown menu.
 *
 * @see docs/backend/dynamodb-spec/10-PHASE9-GOOGLE-CALENDAR.md
 */

import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '@/stores';
import { useAuth } from '@/lib/auth';
import { NotificationDropdown } from './NotificationDropdown';

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M10 2C7.5 2 5.5 4 5.5 6.5V11L4 13V14H16V13L14.5 11V6.5C14.5 4 12.5 2 10 2Z" />
      <path d="M8 14V15C8 16.1 8.9 17 10 17C11.1 17 12 16.1 12 15V14" />
    </svg>
  );
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { userId } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    unreadCount,
    isDropdownOpen,
    toggleDropdown,
    closeDropdown,
    fetchNotifications,
  } = useNotificationsStore();

  // Fetch notifications on mount
  useEffect(() => {
    if (userId) {
      fetchNotifications(userId);
    }
  }, [userId, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, closeDropdown]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen, closeDropdown]);

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center w-10 h-10 mx-auto border-none bg-transparent text-muted rounded-sm cursor-pointer transition-all duration-fast no-underline relative hover:text-secondary hover:bg-elevated"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <BellIcon />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && <NotificationDropdown />}
    </div>
  );
}
