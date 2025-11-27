'use client';

/**
 * Command Palette
 * Central hub for navigation, actions, and search (Cmd+K).
 *
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 5 Command Palette
 * @see docs/PRODUCT_VISION.md - Section 7 Global Search
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore, useThemeStore } from '@/stores';

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  group: 'actions' | 'navigation' | 'recent' | 'search';
  action: () => void;
}

// Fuzzy match helper
function fuzzyMatch(query: string, text: string): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Direct substring match
  if (textLower.includes(queryLower)) return true;

  // Non-contiguous character match
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
}

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { isCommandPaletteOpen, closeCommandPalette } = useUIStore();
  const { setTheme } = useThemeStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define available commands
  const allCommands: CommandItem[] = [
    // Actions
    {
      id: 'new-event',
      label: 'Create new event',
      shortcut: '\u2318N',
      icon: '\uD83D\uDCC5',
      group: 'actions',
      action: () => {
        closeCommandPalette();
        router.push('/calendar?action=new');
      },
    },
    {
      id: 'new-task',
      label: 'Create new task',
      shortcut: '\u2318T',
      icon: '\u2713',
      group: 'actions',
      action: () => {
        closeCommandPalette();
        router.push('/tasks?action=new');
      },
    },
    {
      id: 'new-note',
      label: 'Create new note',
      shortcut: '\u2318\u21E7N',
      icon: '\uD83D\uDCDD',
      group: 'actions',
      action: () => {
        closeCommandPalette();
        router.push('/notes?action=new');
      },
    },
    {
      id: 'theme-light',
      label: 'Switch to light theme',
      icon: '\u2600\uFE0F',
      group: 'actions',
      action: () => {
        setTheme('light');
        closeCommandPalette();
      },
    },
    {
      id: 'theme-dark',
      label: 'Switch to dark theme',
      icon: '\uD83C\uDF19',
      group: 'actions',
      action: () => {
        setTheme('dark');
        closeCommandPalette();
      },
    },
    {
      id: 'theme-auto',
      label: 'Use system theme',
      icon: '\uD83D\uDDA5\uFE0F',
      group: 'actions',
      action: () => {
        setTheme('auto');
        closeCommandPalette();
      },
    },
    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      shortcut: 'g h',
      icon: '\uD83C\uDFE0',
      group: 'navigation',
      action: () => {
        closeCommandPalette();
        router.push('/');
      },
    },
    {
      id: 'nav-calendar',
      label: 'Go to Calendar',
      shortcut: 'g c',
      icon: '\uD83D\uDCC5',
      group: 'navigation',
      action: () => {
        closeCommandPalette();
        router.push('/calendar');
      },
    },
    {
      id: 'nav-tasks',
      label: 'Go to Tasks',
      shortcut: 'g t',
      icon: '\u2713',
      group: 'navigation',
      action: () => {
        closeCommandPalette();
        router.push('/tasks');
      },
    },
    {
      id: 'nav-reminders',
      label: 'Go to Reminders',
      shortcut: 'g r',
      icon: '\uD83D\uDD14',
      group: 'navigation',
      action: () => {
        closeCommandPalette();
        router.push('/reminders');
      },
    },
    {
      id: 'nav-notes',
      label: 'Go to Notes',
      shortcut: 'g n',
      icon: '\uD83D\uDCDD',
      group: 'navigation',
      action: () => {
        closeCommandPalette();
        router.push('/notes');
      },
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      shortcut: '\u2318,',
      icon: '\u2699\uFE0F',
      group: 'navigation',
      action: () => {
        closeCommandPalette();
        router.push('/settings');
      },
    },
  ];

  // Filter commands based on query
  const filteredCommands = query
    ? allCommands.filter((cmd) => fuzzyMatch(query, cmd.label))
    : allCommands;

  // Group commands
  const groupedCommands = {
    actions: filteredCommands.filter((c) => c.group === 'actions'),
    navigation: filteredCommands.filter((c) => c.group === 'navigation'),
    recent: filteredCommands.filter((c) => c.group === 'recent'),
    search: filteredCommands.filter((c) => c.group === 'search'),
  };

  const flatCommands = [
    ...groupedCommands.actions,
    ...groupedCommands.navigation,
    ...groupedCommands.recent,
    ...groupedCommands.search,
  ];

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isCommandPaletteOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
        return;
      }

      if (!isCommandPaletteOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeCommandPalette();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, closeCommandPalette, flatCommands, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector('[data-selected="true"]');
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  const renderGroup = (title: string, items: CommandItem[], startIndex: number) => {
    if (items.length === 0) return null;

    return (
      <div className="px-2">
        <div className="py-2 px-3 text-xs font-medium text-muted uppercase tracking-wide">{title}</div>
        {items.map((item, idx) => {
          const globalIndex = startIndex + idx;
          const isSelected = globalIndex === selectedIndex;

          return (
            <button
              key={item.id}
              className={`flex items-center w-full py-2 px-3 m-0 bg-transparent border-none rounded-sm text-primary text-base text-left cursor-pointer transition-colors duration-fast ${isSelected ? 'bg-elevated' : 'hover:bg-elevated'}`}
              data-selected={isSelected}
              onClick={() => item.action()}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
            >
              {item.icon && <span className="w-6 mr-2 text-center text-base">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="font-mono text-xs text-muted bg-base py-0.5 px-1.5 rounded-sm">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  let currentIndex = 0;
  const actionsStartIndex = currentIndex;
  currentIndex += groupedCommands.actions.length;
  const navigationStartIndex = currentIndex;
  currentIndex += groupedCommands.navigation.length;
  const recentStartIndex = currentIndex;
  currentIndex += groupedCommands.recent.length;
  const searchStartIndex = currentIndex;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-[fadeIn_150ms_ease-out]"
        onClick={closeCommandPalette}
      />
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-[560px] bg-surface border border-visible rounded-md shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-[101] overflow-hidden animate-[slideIn_300ms_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="p-3 border-b border-subtle">
          <input
            ref={inputRef}
            type="text"
            className="w-full py-2 px-3 bg-base border border-visible rounded-sm text-primary text-base outline-none transition-colors duration-fast focus:border-accent placeholder:text-muted"
            placeholder="Search commands, actions, or items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto py-2" ref={listRef}>
          {flatCommands.length === 0 ? (
            <div className="py-8 px-4 text-center text-muted">No results found</div>
          ) : (
            <>
              {renderGroup('Actions', groupedCommands.actions, actionsStartIndex)}
              {renderGroup('Navigation', groupedCommands.navigation, navigationStartIndex)}
              {renderGroup('Recent', groupedCommands.recent, recentStartIndex)}
              {renderGroup('Search Results', groupedCommands.search, searchStartIndex)}
            </>
          )}
        </div>
        <div className="flex gap-4 py-2 px-3 border-t border-subtle bg-base">
          <span className="text-xs text-muted flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-surface border border-visible rounded-sm">{'\u2191'}</kbd>
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-surface border border-visible rounded-sm">{'\u2193'}</kbd> navigate
          </span>
          <span className="text-xs text-muted flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-surface border border-visible rounded-sm">{'\u21B5'}</kbd> select
          </span>
          <span className="text-xs text-muted flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-surface border border-visible rounded-sm">esc</kbd> close
          </span>
        </div>
      </div>
    </>
  );
}
