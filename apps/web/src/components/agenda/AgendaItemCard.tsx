'use client';

/**
 * Agenda Item Card
 * Unified card component for events, tasks, and reminders in the agenda view.
 *
 * @see docs/PRODUCT_VISION.md - Section 5 Unified Agenda
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 5.3 Cards
 */

import React from 'react';
import { type AgendaItem, formatTime, formatTimeRange } from '@/lib/api';

interface AgendaItemCardProps {
  item: AgendaItem;
  onClick?: () => void;
}

// Priority colors for tasks
const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444', // P1 - Red
  2: '#f97316', // P2 - Orange
  3: '#f59e0b', // P3 - Amber
  4: '#3b82f6', // P4 - Blue
  5: '#6b7280', // P5 - Gray
};

// Status badges
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6' },
  COMPLETED: { label: 'Done', color: '#10b981' },
  PENDING: { label: 'Pending', color: '#f59e0b' },
  SNOOZED: { label: 'Snoozed', color: '#6b7280' },
};

export function AgendaItemCard({ item, onClick }: AgendaItemCardProps) {
  const isEvent = item.entityType === 'EVENT' || item.entityType === 'INSTANCE';
  const isTask = item.entityType === 'TASK';
  const isReminder = item.entityType === 'REMINDER';

  // Default colors by type
  const defaultColor = isEvent
    ? '#4285F4'
    : isTask
      ? PRIORITY_COLORS[item.priority || 5]
      : '#f59e0b';

  const itemColor = item.color || defaultColor;
  const badgeColor = STATUS_LABELS[item.status || '']?.color || '#6b7280';

  return (
    <div
      className="flex items-start gap-3 p-3 bg-surface rounded-sm cursor-pointer transition-all duration-fast hover:bg-elevated"
      onClick={onClick}
    >
      <div
        className="w-1 min-h-[40px] h-full rounded-sm flex-shrink-0"
        style={{ backgroundColor: itemColor }}
      />

      <div className="flex-shrink-0 w-[70px] text-sm text-secondary">
        {item.isAllDay ? (
          <span className="text-xs font-medium" style={{ color: itemColor }}>All day</span>
        ) : (
          <span>{formatTime(item.datetime)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0" style={{ color: itemColor }}>
            {getIcon(item.entityType)}
          </span>
          <span className="text-sm font-medium text-primary overflow-hidden text-ellipsis whitespace-nowrap">
            {item.title}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mt-1 text-xs text-secondary">
          {isEvent && item.endUtc && !item.isAllDay && (
            <span className="text-muted">{formatTimeRange(item.datetime, item.endUtc)}</span>
          )}
          {isEvent && item.location && (
            <span className="flex items-center gap-1">
              <span className="text-[10px]">📍</span>
              {item.location}
            </span>
          )}
          {isTask && item.status && (
            <span
              className="py-px px-1.5 text-white rounded-sm font-medium text-[10px]"
              style={{ backgroundColor: badgeColor }}
            >
              {STATUS_LABELS[item.status]?.label || item.status}
            </span>
          )}
          {isTask && item.effort && (
            <span className="py-px px-1.5 bg-elevated rounded-sm font-medium">
              {item.effort}pt
            </span>
          )}
          {isReminder && item.reminderStatus === 'SNOOZED' && item.snoozedUntil && (
            <span className="text-muted italic">
              Snoozed until {formatTime(item.snoozedUntil)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple icons for entity types
function getIcon(entityType: string): React.ReactNode {
  switch (entityType) {
    case 'EVENT':
    case 'INSTANCE':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
          <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
        </svg>
      );
    case 'TASK':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
          <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
        </svg>
      );
    case 'REMINDER':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" strokeWidth="2" stroke="currentColor" fill="none"/>
        </svg>
      );
  }
}
