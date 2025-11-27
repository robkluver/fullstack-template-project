'use client';

/**
 * ImportResultsModal Component
 * Modal showing Google Calendar import results with conflict details.
 *
 * @see docs/specs/google-calendar-import.feature
 */

import { useEffect, useCallback } from 'react';
import type { Notification, GoogleImportMetadata, GoogleImportConflict } from '@nexus/shared';

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10L9 12.5L13.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3L18 17H2L10 3Z" strokeLinejoin="round" />
      <path d="M10 8V11" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.5" fill="currentColor" />
    </svg>
  );
}

interface ImportResultsModalProps {
  notification: Notification;
  onClose: () => void;
}

export function ImportResultsModal({ notification, onClose }: ImportResultsModalProps) {
  const metadata = notification.metadata as GoogleImportMetadata | undefined;

  // Close on escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling on body while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Format date for conflict display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const hasConflicts = metadata?.conflicts && metadata.conflicts.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-results-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-surface border border-subtle rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <h2 id="import-results-title" className="text-lg font-semibold text-primary">
            {notification.title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-secondary hover:bg-elevated rounded transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Summary stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="text-green-500" />
              <div>
                <p className="text-2xl font-semibold text-primary">
                  {metadata?.imported ?? 0}
                </p>
                <p className="text-xs text-muted">Events imported</p>
              </div>
            </div>

            {hasConflicts && (
              <div className="flex items-center gap-2">
                <WarningIcon className="text-orange-500" />
                <div>
                  <p className="text-2xl font-semibold text-primary">
                    {metadata?.conflicts?.length ?? 0}
                  </p>
                  <p className="text-xs text-muted">Conflicts</p>
                </div>
              </div>
            )}

            {(metadata?.skipped ?? 0) > 0 && (
              <div>
                <p className="text-2xl font-semibold text-muted">
                  {metadata?.skipped ?? 0}
                </p>
                <p className="text-xs text-muted">Skipped</p>
              </div>
            )}
          </div>

          {/* Conflicts list */}
          {hasConflicts && (
            <div>
              <h3 className="text-sm font-medium text-secondary mb-3">
                Conflicting Events
              </h3>
              <p className="text-xs text-muted mb-3">
                These events were modified both locally and in Google Calendar.
                Local changes have been preserved.
              </p>

              <div className="border border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-elevated">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-secondary">
                        Event
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-secondary">
                        Local Modified
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-secondary">
                        Google Modified
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metadata?.conflicts?.map((conflict: GoogleImportConflict, index: number) => (
                      <tr
                        key={conflict.eventId}
                        className={index % 2 === 0 ? '' : 'bg-elevated/50'}
                      >
                        <td className="px-3 py-2 text-primary truncate max-w-[150px]">
                          {conflict.title}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatDate(conflict.localUpdatedAt)}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {formatDate(conflict.googleUpdatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success message when no conflicts */}
          {!hasConflicts && (metadata?.imported ?? 0) > 0 && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircleIcon className="text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">
                All events were imported successfully with no conflicts.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-primary bg-elevated hover:bg-surface border border-subtle rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
