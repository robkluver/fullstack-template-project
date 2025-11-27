'use client';

/**
 * Authentication Context
 * Provides auth state and methods to components.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  login as authLogin,
  logout as authLogout,
  getAuthState,
  refreshAccessToken,
  type AuthState,
  AuthError,
} from './client';

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    accessToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      const storedState = getAuthState();

      if (storedState.isAuthenticated) {
        setState(storedState);
      } else if (storedState.userId) {
        // Token expired, try to refresh
        const newToken = await refreshAccessToken();
        if (newToken) {
          setState({
            ...storedState,
            isAuthenticated: true,
            accessToken: newToken,
          });
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Refresh token 5 minutes before expiry
    const refreshInterval = setInterval(async () => {
      const newToken = await refreshAccessToken();
      if (newToken) {
        setState((prev) => ({ ...prev, accessToken: newToken }));
      } else {
        // Refresh failed, log out
        setState({
          isAuthenticated: false,
          userId: null,
          email: null,
          accessToken: null,
        });
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const newState = await authLogin(email, password);
      setState(newState);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authLogout();
    } finally {
      setState({
        isAuthenticated: false,
        userId: null,
        email: null,
        accessToken: null,
      });
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
