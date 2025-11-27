/**
 * Theme Store
 * Manages theme state (light/dark/auto) with system preference detection.
 *
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 3.1 Color System
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  initializeTheme: () => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'auto',
      resolvedTheme: 'dark', // Default to dark until initialized

      setTheme: (theme: Theme) => {
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ theme, resolvedTheme });
      },

      initializeTheme: () => {
        const { theme } = get();
        const resolvedTheme = resolveTheme(theme);
        applyTheme(resolvedTheme);
        set({ resolvedTheme });

        // Listen for system theme changes when in auto mode
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            const currentTheme = get().theme;
            if (currentTheme === 'auto') {
              const newResolved = getSystemTheme();
              applyTheme(newResolved);
              set({ resolvedTheme: newResolved });
            }
          };
          mediaQuery.addEventListener('change', handleChange);
        }
      },
    }),
    {
      name: 'nexus-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
