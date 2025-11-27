'use client';

/**
 * ThemeProvider
 * Initializes theme on mount and provides theme context to the app.
 *
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 3.1 Color System
 */

import { useEffect } from 'react';
import { useThemeStore } from '@/stores';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return <>{children}</>;
}
