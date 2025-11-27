'use client';

/**
 * GoogleCalendarCard Component
 * Shows Google Calendar connection status and provides connect/import actions.
 *
 * @see docs/specs/google-calendar-import.feature
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { googleCalendarApi } from '@/lib/api';
import type { GoogleOAuthStatus } from '@nexus/shared';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8L6 11L13 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className || ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GoogleCalendarCard() {
  const { userId } = useAuth();
  const [status, setStatus] = useState<GoogleOAuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status on mount
  useEffect(() => {
    async function fetchStatus() {
      if (!userId) return;

      try {
        const result = await googleCalendarApi.getGoogleCalendarStatus(userId);
        setStatus(result);
      } catch (err) {
        console.error('Failed to fetch Google Calendar status:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatus();
  }, [userId]);

  // Handle OAuth callback from URL
  useEffect(() => {
    async function handleCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const errorParam = urlParams.get('error');

      if (errorParam) {
        setError('Google Calendar access was denied');
        // Clear URL params
        window.history.replaceState({}, '', '/settings');
        return;
      }

      if (code && state) {
        setIsConnecting(true);
        try {
          await googleCalendarApi.exchangeGoogleCode(code, state);
          // Refresh status
          if (userId) {
            const result = await googleCalendarApi.getGoogleCalendarStatus(userId);
            setStatus(result);
          }
        } catch (err) {
          setError('Failed to connect Google Calendar');
          console.error(err);
        } finally {
          setIsConnecting(false);
          // Clear URL params
          window.history.replaceState({}, '', '/settings');
        }
      }
    }

    handleCallback();
  }, [userId]);

  const handleConnect = async () => {
    if (!userId) return;

    setIsConnecting(true);
    setError(null);

    try {
      const { authorizationUrl } = await googleCalendarApi.getGoogleAuthUrl(userId);
      // Redirect to Google OAuth
      window.location.href = authorizationUrl;
    } catch (err) {
      setError('Failed to start Google Calendar connection');
      setIsConnecting(false);
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    if (!userId || !status?.connected) return;

    if (!confirm('Are you sure you want to disconnect Google Calendar? Your imported events will remain in Nexus.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      await googleCalendarApi.revokeGoogleAccess(userId);
      setStatus({ connected: false });
    } catch (err) {
      setError('Failed to disconnect Google Calendar');
      console.error(err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleImport = async () => {
    if (!userId || !status?.connected) return;

    setIsImporting(true);
    setError(null);

    try {
      const result = await googleCalendarApi.importGoogleCalendar(userId);
      // Update last sync time
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              lastSyncAt: new Date().toISOString(),
            }
          : prev
      );
      // Show success message (could also open the notification dropdown)
      alert(`Imported ${result.imported} events${result.conflicts.length > 0 ? ` (${result.conflicts.length} conflicts)` : ''}`);
    } catch (err) {
      setError('Failed to import from Google Calendar');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 p-4 bg-elevated/50 border border-subtle rounded-lg">
        <LoadingSpinner className="text-muted" />
        <span className="text-sm text-muted">Loading...</span>
      </div>
    );
  }

  return (
    <div className="border border-subtle rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-elevated/30">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm">
          <GoogleIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-primary m-0">Google Calendar</h3>
          <p className="text-sm text-muted m-0">
            {status?.connected ? (
              <span className="flex items-center gap-1">
                <CheckIcon className="text-green-500" />
                Connected as {status.email}
              </span>
            ) : (
              'Not connected'
            )}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 border-t border-subtle">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500 m-0">{error}</p>
          </div>
        )}

        {status?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Last sync:</span>
              <span className="text-secondary">{formatLastSync(status.lastSyncAt)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <LoadingSpinner />
                    Importing...
                  </>
                ) : (
                  'Import from Google Calendar'
                )}
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="py-2 px-4 text-red-500 hover:bg-red-500/10 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner />
                Connecting...
              </>
            ) : (
              'Connect Google Calendar'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
