/**
 * UI Store
 * Manages global UI state like command palette visibility, sidebar state, etc.
 *
 * @see docs/frontend/DESIGN_GUIDELINES.md - Section 5 Command Palette
 */

import { create } from 'zustand';

interface UIState {
  // Command Palette
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Sidebar (for mobile)
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;

  // Active navigation item
  activeNavItem: string;
  setActiveNavItem: (item: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Command Palette
  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  // Sidebar
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Navigation
  activeNavItem: 'home',
  setActiveNavItem: (item: string) => set({ activeNavItem: item }),
}));
