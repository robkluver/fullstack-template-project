import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

const meta: Meta = {
  title: 'Components/CommandPalette',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  group: 'actions' | 'navigation';
}

const mockCommands: CommandItem[] = [
  { id: 'new-event', label: 'Create new event', shortcut: '\u2318N', icon: '\uD83D\uDCC5', group: 'actions' },
  { id: 'new-task', label: 'Create new task', shortcut: '\u2318T', icon: '\u2713', group: 'actions' },
  { id: 'new-note', label: 'Create new note', shortcut: '\u2318\u21E7N', icon: '\uD83D\uDCDD', group: 'actions' },
  { id: 'theme-light', label: 'Switch to light theme', icon: '\u2600\uFE0F', group: 'actions' },
  { id: 'theme-dark', label: 'Switch to dark theme', icon: '\uD83C\uDF19', group: 'actions' },
  { id: 'nav-home', label: 'Go to Home', shortcut: 'g h', icon: '\uD83C\uDFE0', group: 'navigation' },
  { id: 'nav-calendar', label: 'Go to Calendar', shortcut: 'g c', icon: '\uD83D\uDCC5', group: 'navigation' },
  { id: 'nav-tasks', label: 'Go to Tasks', shortcut: 'g t', icon: '\u2713', group: 'navigation' },
  { id: 'nav-reminders', label: 'Go to Reminders', shortcut: 'g r', icon: '\uD83D\uDD14', group: 'navigation' },
  { id: 'nav-notes', label: 'Go to Notes', shortcut: 'g n', icon: '\uD83D\uDCDD', group: 'navigation' },
  { id: 'nav-settings', label: 'Go to Settings', shortcut: '\u2318,', icon: '\u2699\uFE0F', group: 'navigation' },
];

function MockCommandPalette({
  query: initialQuery = '',
  selectedIndex: initialSelected = 0,
}: {
  query?: string;
  selectedIndex?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(initialSelected);

  const filteredCommands = query
    ? mockCommands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase()))
    : mockCommands;

  const groupedCommands = {
    actions: filteredCommands.filter((c) => c.group === 'actions'),
    navigation: filteredCommands.filter((c) => c.group === 'navigation'),
  };

  const renderGroup = (title: string, items: CommandItem[], startIndex: number) => {
    if (items.length === 0) return null;
    return (
      <div className="px-2">
        <div className="py-2 px-3 text-xs font-medium text-[#64748b] uppercase tracking-wide">{title}</div>
        {items.map((item, idx) => {
          const globalIndex = startIndex + idx;
          const isSelected = globalIndex === selectedIndex;
          return (
            <button
              key={item.id}
              className={`flex items-center w-full py-2 px-3 bg-transparent border-none rounded-sm text-[#f8fafc] text-sm text-left cursor-pointer ${isSelected ? 'bg-[#334155]' : 'hover:bg-[#334155]'}`}
              onMouseEnter={() => setSelectedIndex(globalIndex)}
            >
              {item.icon && <span className="w-6 mr-2 text-center text-base">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="font-mono text-xs text-[#64748b] bg-[#0f172a] py-0.5 px-1.5 rounded-sm">{item.shortcut}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-[560px] bg-[#1e293b] border border-[rgba(148,163,184,0.2)] rounded-sm shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-3 border-b border-[rgba(148,163,184,0.1)]">
          <input
            type="text"
            className="w-full py-2 px-3 bg-[#0f172a] border border-[rgba(148,163,184,0.2)] rounded-sm text-[#f8fafc] text-sm outline-none focus:border-[#3b82f6] placeholder:text-[#64748b]"
            placeholder="Search commands, actions, or items..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 px-4 text-center text-[#64748b]">No results found</div>
          ) : (
            <>
              {renderGroup('Actions', groupedCommands.actions, 0)}
              {renderGroup('Navigation', groupedCommands.navigation, groupedCommands.actions.length)}
            </>
          )}
        </div>
        <div className="flex gap-4 py-2 px-3 border-t border-[rgba(148,163,184,0.1)] bg-[#0f172a]">
          <span className="text-xs text-[#64748b] flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-[#1e293b] border border-[rgba(148,163,184,0.2)] rounded-sm">{'\u2191'}</kbd>
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-[#1e293b] border border-[rgba(148,163,184,0.2)] rounded-sm">{'\u2193'}</kbd> navigate
          </span>
          <span className="text-xs text-[#64748b] flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-[#1e293b] border border-[rgba(148,163,184,0.2)] rounded-sm">{'\u21B5'}</kbd> select
          </span>
          <span className="text-xs text-[#64748b] flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[20px] py-0.5 px-1 font-mono text-[10px] bg-[#1e293b] border border-[rgba(148,163,184,0.2)] rounded-sm">esc</kbd> close
          </span>
        </div>
      </div>
    </>
  );
}

export const Default: Story = {
  render: () => <MockCommandPalette />,
};

export const WithQuery: Story = {
  render: () => <MockCommandPalette query="task" />,
};

export const NoResults: Story = {
  render: () => <MockCommandPalette query="zzzzz" />,
};

export const NavigationSelected: Story = {
  render: () => <MockCommandPalette selectedIndex={7} />,
};

export const ActionsOnly: Story = {
  render: () => <MockCommandPalette query="theme" />,
};

export const NavigationOnly: Story = {
  render: () => <MockCommandPalette query="go to" />,
};
