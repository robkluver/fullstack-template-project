'use client';

/**
 * Login Page
 * OAuth password grant login form.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/');
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-base">
      <div className="w-full max-w-[400px] p-8 bg-elevated border border-subtle rounded-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary m-0 mb-2">Nexus</h1>
          <p className="text-base text-secondary m-0">Sign in to your account</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-500 text-sm">
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="p-3 bg-base border border-subtle rounded-sm text-base text-primary transition-colors duration-fast focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-muted"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-primary">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="p-3 bg-base border border-subtle rounded-sm text-base text-primary transition-colors duration-fast focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-muted"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="p-3 bg-accent border-none rounded-sm text-base font-medium text-white cursor-pointer transition-all duration-fast hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting || !email || !password}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted m-0">
            Demo: Use any email/password to test
          </p>
        </div>
      </div>
    </div>
  );
}
