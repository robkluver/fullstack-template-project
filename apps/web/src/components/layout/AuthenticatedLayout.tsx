'use client';

/**
 * Authenticated Layout
 * Wraps pages with auth check and shows AppShell for authenticated users.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AppShell } from './AppShell';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    // Skip redirect while loading
    if (isLoading) return;

    // Redirect to login if not authenticated and not on public route
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isPublicRoute, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="w-10 h-10 border-3 border-visible border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  // For public routes, render without AppShell
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, show loading or redirect
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated user - render with AppShell
  return <AppShell>{children}</AppShell>;
}
