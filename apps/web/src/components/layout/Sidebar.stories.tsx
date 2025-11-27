import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const meta: Meta = {
  title: 'Components/Layout/Sidebar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

// Since Sidebar uses hooks that require providers, we create a mock version
function MockSidebarItem({
  icon,
  label,
  isActive = false,
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        margin: '0 auto',
        background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        color: isActive ? '#3b82f6' : '#64748b',
        borderRadius: '2px',
        cursor: 'pointer',
        position: 'relative',
      }}
      title={label}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: '-8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '20px',
            background: '#3b82f6',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      {icon}
    </div>
  );
}

function MockSidebar({ activeItem = 'home' }: { activeItem?: string }) {
  const items = [
    { id: 'search', icon: '🔍' },
    { id: 'home', icon: '🏠' },
    { id: 'calendar', icon: '📅' },
    { id: 'tasks', icon: '✓' },
    { id: 'reminders', icon: '🔔' },
    { id: 'notes', icon: '📝' },
  ];

  return (
    <aside
      style={{
        width: '56px',
        height: '100vh',
        backgroundColor: '#1e293b',
        borderRight: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 0',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '4px' }}>
        {items.map((item) => (
          <MockSidebarItem
            key={item.id}
            icon={<span style={{ fontSize: '18px' }}>{item.icon}</span>}
            label={item.id}
            isActive={item.id === activeItem}
          />
        ))}
      </nav>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
        <MockSidebarItem icon={<span style={{ fontSize: '16px' }}>☀️</span>} label="Theme" />
        <MockSidebarItem icon={<span style={{ fontSize: '16px' }}>⚙️</span>} label="Settings" />
        <MockSidebarItem icon={<span style={{ fontSize: '16px' }}>🚪</span>} label="Logout" />
      </div>
    </aside>
  );
}

export const Default: Story = {
  render: () => <MockSidebar activeItem="home" />,
};

export const CalendarActive: Story = {
  render: () => <MockSidebar activeItem="calendar" />,
};

export const TasksActive: Story = {
  render: () => <MockSidebar activeItem="tasks" />,
};

export const NotesActive: Story = {
  render: () => <MockSidebar activeItem="notes" />,
};

export const WithAppContent: Story = {
  render: () => (
    <div style={{ display: 'flex', height: '100vh' }}>
      <MockSidebar activeItem="home" />
      <main
        style={{
          flex: 1,
          backgroundColor: '#0f172a',
          padding: '24px',
          color: '#f8fafc',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 700 }}>Today</h1>
        <p style={{ margin: 0, color: '#94a3b8' }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </main>
    </div>
  ),
};
