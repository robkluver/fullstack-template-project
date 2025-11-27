'use client';

/**
 * AppShell
 * Main application layout with sidebar and content area.
 *
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 8.1 Application Shell
 */

import { Sidebar } from './Sidebar';
import { CommandPalette } from '@/components/command-palette/CommandPalette';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-14 sm:ml-14 max-sm:ml-0 min-h-screen bg-base">
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
