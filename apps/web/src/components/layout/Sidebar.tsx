'use client';

/**
 * Sidebar Navigation
 * 56px fixed left rail with icon-only navigation.
 *
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 8.2 Sidebar Navigation
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore, useThemeStore } from '@/stores';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from '@/components/notifications';

// Icon components (inline SVGs for performance)
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="9" r="6" />
      <path d="M13.5 13.5L17 17" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 10L10 3L17 10V17H12V13H8V17H3V10Z" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="14" height="13" rx="1" />
      <path d="M3 8H17" />
      <path d="M7 2V5" strokeLinecap="round" />
      <path d="M13 2V5" strokeLinecap="round" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 5L6 7L10 3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12L6 14L10 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5H17" strokeLinecap="round" />
      <path d="M12 12H17" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2C7.5 2 5.5 4 5.5 6.5V11L4 13V14H16V13L14.5 11V6.5C14.5 4 12.5 2 10 2Z" />
      <path d="M8 14V15C8 16.1 8.9 17 10 17C11.1 17 12 16.1 12 15V14" />
    </svg>
  );
}

function NotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="2" width="12" height="16" rx="1" />
      <path d="M7 6H13" strokeLinecap="round" />
      <path d="M7 10H13" strokeLinecap="round" />
      <path d="M7 14H10" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2V4M10 16V18M2 10H4M16 10H18M4.22 4.22L5.64 5.64M14.36 14.36L15.78 15.78M15.78 4.22L14.36 5.64M5.64 14.36L4.22 15.78" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.05 3.05L4.46 4.46M11.54 11.54L12.95 12.95M12.95 3.05L11.54 4.46M4.46 11.54L3.05 12.95" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.5 9.5C12.5 10.5 11 11 9.5 11C6.5 11 4 8.5 4 5.5C4 4 4.5 2.5 5.5 1.5C2.5 2.5 0.5 5.5 0.5 8.5C0.5 12.5 3.5 15.5 7.5 15.5C10.5 15.5 13 13.5 14 10.5C13.8 10.2 13.7 9.8 13.5 9.5Z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2H3C2.45 2 2 2.45 2 3V13C2 13.55 2.45 14 3 14H6" strokeLinecap="round" />
      <path d="M11 11L14 8L11 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8H6" strokeLinecap="round" />
    </svg>
  );
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: HomeIcon, shortcut: 'g h' },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: CalendarIcon, shortcut: 'g c' },
  { id: 'tasks', label: 'Tasks', href: '/tasks', icon: TasksIcon, shortcut: 'g t' },
  { id: 'reminders', label: 'Reminders', href: '/reminders', icon: BellIcon, shortcut: 'g r' },
  { id: 'notes', label: 'Notes', href: '/notes', icon: NotesIcon, shortcut: 'g n' },
];

// Sidebar item base styles
const sidebarItemBase = 'flex items-center justify-center w-10 h-10 mx-auto border-none bg-transparent text-muted rounded-sm cursor-pointer transition-all duration-fast no-underline relative hover:text-secondary hover:bg-elevated';

// Active state styles
const sidebarItemActive = 'text-accent bg-blue-500/10 before:content-[""] before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-accent before:rounded-r-sm';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const openCommandPalette = useUIStore((state) => state.openCommandPalette);
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { logout, email } = useAuth();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex] ?? 'auto';
    setTheme(nextTheme);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="fixed top-0 left-0 w-14 h-screen bg-surface border-r border-subtle z-50 flex flex-col max-sm:hidden">
      <nav className="flex flex-col h-full py-2">
        {/* Search trigger */}
        <button
          onClick={openCommandPalette}
          className={sidebarItemBase}
          title="Search (Cmd+K)"
          aria-label="Open command palette"
        >
          <SearchIcon />
        </button>

        {/* Main navigation */}
        <div className="flex-1 flex flex-col gap-1 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${sidebarItemBase} ${isActive ? sidebarItemActive : ''}`}
                title={`${item.label} (${item.shortcut})`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon />
              </Link>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col gap-1 pb-2">
          {/* Notifications */}
          <NotificationBell />

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className={sidebarItemBase}
            title={`Theme: ${theme} (click to change)`}
            aria-label={`Current theme: ${theme}. Click to change.`}
          >
            {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className={`${sidebarItemBase} ${pathname === '/settings' ? sidebarItemActive : ''}`}
            title="Settings (Cmd+,)"
          >
            <SettingsIcon />
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`${sidebarItemBase} hover:!text-red-500 hover:!bg-red-500/10`}
            title={`Logout ${email ? `(${email})` : ''}`}
            aria-label="Logout"
          >
            <LogoutIcon />
          </button>
        </div>
      </nav>
    </aside>
  );
}
