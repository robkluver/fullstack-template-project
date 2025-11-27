'use client';

/**
 * Settings Page
 * User preferences and configuration.
 *
 * @see docs/PRODUCT_VISION.md - Section 8 Settings & Preferences
 */

import { useEffect } from 'react';
import { useUIStore, useThemeStore, type Theme } from '@/stores';
import { IntegrationsSection } from '@/components/settings';

export default function SettingsPage() {
  const setActiveNavItem = useUIStore((state) => state.setActiveNavItem);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    setActiveNavItem('settings');
  }, [setActiveNavItem]);

  return (
    <div className="max-w-[700px] mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-primary m-0">Settings</h1>
      </header>

      <main className="flex flex-col gap-6">
        {/* General Settings */}
        <section className="bg-surface border border-subtle rounded-md p-4">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-4 pb-3 border-b border-subtle">General</h2>

          <div className="flex items-center justify-between py-3 border-b border-subtle">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Theme</label>
              <p className="text-sm text-muted mt-1 mb-0">Choose your preferred color scheme</p>
            </div>
            <div className="ml-4">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="py-2 px-3 bg-base border border-visible rounded-sm text-primary text-sm cursor-pointer min-w-[150px] focus:outline-none focus:border-accent"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">System</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Timezone</label>
              <p className="text-sm text-muted mt-1 mb-0">Your default timezone for events</p>
            </div>
            <div className="ml-4">
              <select className="py-2 px-3 bg-base border border-visible rounded-sm text-primary text-sm cursor-pointer min-w-[150px] focus:outline-none focus:border-accent" defaultValue="auto">
                <option value="auto">Auto (Browser)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        </section>

        {/* Calendar Settings */}
        <section className="bg-surface border border-subtle rounded-md p-4">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-4 pb-3 border-b border-subtle">Calendar</h2>

          <div className="flex items-center justify-between py-3 border-b border-subtle">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Start of Week</label>
              <p className="text-sm text-muted mt-1 mb-0">First day shown in week view</p>
            </div>
            <div className="ml-4">
              <select className="py-2 px-3 bg-base border border-visible rounded-sm text-primary text-sm cursor-pointer min-w-[150px] focus:outline-none focus:border-accent" defaultValue="0">
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-subtle">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Default Event Duration</label>
              <p className="text-sm text-muted mt-1 mb-0">Duration for new events</p>
            </div>
            <div className="ml-4">
              <select className="py-2 px-3 bg-base border border-visible rounded-sm text-primary text-sm cursor-pointer min-w-[150px] focus:outline-none focus:border-accent" defaultValue="30">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Calendar Increment</label>
              <p className="text-sm text-muted mt-1 mb-0">Time slot intervals in calendar</p>
            </div>
            <div className="ml-4">
              <select className="py-2 px-3 bg-base border border-visible rounded-sm text-primary text-sm cursor-pointer min-w-[150px] focus:outline-none focus:border-accent" defaultValue="15">
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>
        </section>

        {/* Tasks Settings */}
        <section className="bg-surface border border-subtle rounded-md p-4">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-4 pb-3 border-b border-subtle">Tasks</h2>

          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Auto-Archive Completed</label>
              <p className="text-sm text-muted mt-1 mb-0">Move completed tasks to Archived after 24 hours</p>
            </div>
            <div className="ml-4">
              <label className="relative inline-block w-11 h-6">
                <input type="checkbox" defaultChecked className="opacity-0 w-0 h-0 peer" />
                <span className="absolute cursor-pointer inset-0 bg-elevated rounded-xl transition-all duration-fast peer-checked:bg-accent before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-primary before:rounded-full before:transition-all before:duration-fast peer-checked:before:translate-x-5"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <IntegrationsSection />

        {/* Notifications */}
        <section className="bg-surface border border-subtle rounded-md p-4">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide m-0 mb-4 pb-3 border-b border-subtle">Notifications</h2>

          <div className="flex items-center justify-between py-3 border-b border-subtle">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Browser Notifications</label>
              <p className="text-sm text-muted mt-1 mb-0">Show notifications for reminders</p>
            </div>
            <div className="ml-4">
              <label className="relative inline-block w-11 h-6">
                <input type="checkbox" defaultChecked className="opacity-0 w-0 h-0 peer" />
                <span className="absolute cursor-pointer inset-0 bg-elevated rounded-xl transition-all duration-fast peer-checked:bg-accent before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-primary before:rounded-full before:transition-all before:duration-fast peer-checked:before:translate-x-5"></span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <label className="block text-base text-primary font-medium">Sound</label>
              <p className="text-sm text-muted mt-1 mb-0">Play sound when notifications appear</p>
            </div>
            <div className="ml-4">
              <label className="relative inline-block w-11 h-6">
                <input type="checkbox" defaultChecked className="opacity-0 w-0 h-0 peer" />
                <span className="absolute cursor-pointer inset-0 bg-elevated rounded-xl transition-all duration-fast peer-checked:bg-accent before:content-[''] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-primary before:rounded-full before:transition-all before:duration-fast peer-checked:before:translate-x-5"></span>
              </label>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
