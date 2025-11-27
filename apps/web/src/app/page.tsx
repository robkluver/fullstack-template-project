'use client';

/**
 * Home / Unified Agenda
 * First screen users see - chronological timeline of everything happening.
 *
 * @see docs/PRODUCT_VISION.md - Section 5 Unified Agenda / Home
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 8.1 Application Shell
 */

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/stores';
import { unifiedApi, type UnifiedAgendaDay } from '@/lib/api';
import { AgendaItemCard } from '@/components/agenda';

export default function HomePage() {
  const setActiveNavItem = useUIStore((state) => state.setActiveNavItem);
  const [daysAhead, setDaysAhead] = useState(7);

  useEffect(() => {
    setActiveNavItem('home');
  }, [setActiveNavItem]);

  // Get today's date at midnight
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  }, []);

  // Fetch unified agenda
  const { data, isLoading, error } = useQuery({
    queryKey: ['unified-agenda', today, daysAhead],
    queryFn: () => {
      const options: { from?: string; days?: number } = { days: daysAhead };
      if (today) {
        options.from = today;
      }
      return unifiedApi.getUnifiedAgenda(options);
    },
  });

  // Group agenda by "Today", "Tomorrow", and rest of the week
  const groupedAgenda = useMemo(() => {
    if (!data?.agenda) return { today: null, tomorrow: null, thisWeek: [] };

    const todayStr = today ?? '';
    const tomorrowDate = new Date(todayStr);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    let todayAgenda: UnifiedAgendaDay | null = null;
    let tomorrowAgenda: UnifiedAgendaDay | null = null;
    const thisWeek: UnifiedAgendaDay[] = [];

    for (const day of data.agenda) {
      if (day.date === todayStr) {
        todayAgenda = day;
      } else if (day.date === tomorrowStr) {
        tomorrowAgenda = day;
      } else {
        thisWeek.push(day);
      }
    }

    return { today: todayAgenda, tomorrow: tomorrowAgenda, thisWeek };
  }, [data?.agenda, today]);

  const formatDateHeader = (dateStr: string, dayName: string): string => {
    const date = new Date(dateStr);
    return `${dayName}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="max-w-[800px] mx-auto p-6">
      <header className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary m-0 mb-1">Today</h1>
          <p className="text-base text-secondary m-0">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div>
          <select
            className="py-2 px-3 bg-elevated border border-subtle rounded-sm text-sm text-primary cursor-pointer"
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </select>
        </div>
      </header>

      <main className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-secondary">
            <div className="w-8 h-8 border-3 border-subtle border-t-accent rounded-full animate-spin" />
            <p>Loading agenda...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-secondary">
            <p>Failed to load agenda. Please try again.</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            {data?.meta && data.meta.totalItems > 0 && (
              <div className="flex flex-wrap gap-3 p-3 bg-elevated rounded-sm text-sm">
                <span className="font-semibold text-primary">{data.meta.totalItems} items</span>
                {Object.entries(data.meta.byType).map(([type, count]) => (
                  <span key={type} className="text-secondary before:content-['•'] before:mr-2">
                    {count} {type.toLowerCase()}s
                  </span>
                ))}
              </div>
            )}

            {/* Today section */}
            <section className="bg-elevated border-2 border-accent rounded-md p-4">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-3">Today</h2>
              {groupedAgenda.today && groupedAgenda.today.items.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {groupedAgenda.today.items.map((item) => (
                    <AgendaItemCard key={`${item.entityType}-${item.id}`} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-muted">
                  <p className="m-0">No events, tasks, or reminders for today.</p>
                  <p className="text-muted mt-2 m-0">
                    Press <kbd className="inline-flex items-center justify-center py-0.5 px-1.5 font-mono text-xs bg-base border border-subtle rounded-sm">Cmd+K</kbd> to create something new.
                  </p>
                </div>
              )}
            </section>

            {/* Tomorrow section */}
            <section className="bg-elevated border border-subtle rounded-md p-4">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-3">Tomorrow</h2>
              {groupedAgenda.tomorrow && groupedAgenda.tomorrow.items.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {groupedAgenda.tomorrow.items.map((item) => (
                    <AgendaItemCard key={`${item.entityType}-${item.id}`} item={item} />
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-muted">
                  <p className="text-muted m-0">Nothing scheduled</p>
                </div>
              )}
            </section>

            {/* Rest of the week */}
            {groupedAgenda.thisWeek.length > 0 && (
              <section className="bg-elevated border border-subtle rounded-md p-4">
                <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-3">This Week</h2>
                {groupedAgenda.thisWeek.map((day) => (
                  <div key={day.date} className="mt-4 first:mt-0">
                    <h3 className="text-sm font-medium text-primary m-0 mb-2">
                      {formatDateHeader(day.date, day.dayName)}
                    </h3>
                    {day.items.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {day.items.map((item) => (
                          <AgendaItemCard key={`${item.entityType}-${item.id}`} item={item} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted m-0 py-2">No items</p>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Empty state when nothing at all */}
            {data?.meta.totalItems === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-elevated border border-subtle rounded-md">
                <div className="text-muted mb-4">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="8" y="8" width="32" height="32" rx="4" />
                    <path d="M8 16H40" />
                    <path d="M16 8V16" />
                    <path d="M32 8V16" />
                    <path d="M18 26L22 30L30 22" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="text-lg text-primary m-0 mb-2">All clear!</h2>
                <p className="text-muted m-0">
                  No upcoming events, tasks, or reminders.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
