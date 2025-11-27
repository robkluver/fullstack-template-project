'use client';

/**
 * IntegrationsSection Component
 * Section in Settings for third-party integrations.
 *
 * @see docs/specs/google-calendar-import.feature
 */

import { GoogleCalendarCard } from './GoogleCalendarCard';

export function IntegrationsSection() {
  return (
    <section className="bg-surface border border-subtle rounded-md p-4">
      <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-4 pb-3 border-b border-subtle">
        Integrations
      </h2>

      <div className="space-y-4">
        <GoogleCalendarCard />

        {/* Future integrations can be added here */}
      </div>
    </section>
  );
}
