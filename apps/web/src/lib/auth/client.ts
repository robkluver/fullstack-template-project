/**
 * Authentication API Client
 * Handles OAuth 2.0 token management.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

// Storage keys
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'nexus_access_token',
  REFRESH_TOKEN: 'nexus_refresh_token',
  USER_ID: 'nexus_user_id',
  USER_EMAIL: 'nexus_user_email',
  TOKEN_EXPIRY: 'nexus_token_expiry',
} as const;

// Token response from OAuth server
export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
}

// User info from /oauth/userinfo
export interface UserInfo {
  sub: string;
  email: string;
  roles: string[];
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthState> {
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: email,
      password: password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new AuthError(error.error_description || 'Login failed', error.error);
  }

  const tokens: TokenResponse = await response.json();

  // Store tokens
  storeTokens(tokens);

  // Get user info
  const userInfo = await getUserInfo(tokens.access_token);

  // Store user info
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEYS.USER_ID, userInfo.sub);
    localStorage.setItem(TOKEN_KEYS.USER_EMAIL, userInfo.email);
  }

  return {
    isAuthenticated: true,
    userId: userInfo.sub,
    email: userInfo.email,
    accessToken: tokens.access_token,
  };
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      // Refresh failed, clear tokens
      clearTokens();
      return null;
    }

    const tokens: TokenResponse = await response.json();
    storeTokens(tokens);
    return tokens.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Logout - revoke tokens and clear storage
 */
export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: refreshToken,
          token_type_hint: 'refresh_token',
        }),
      });
    } catch {
      // Ignore revoke errors, still clear local tokens
    }
  }

  clearTokens();
}

/**
 * Get user info from OAuth server
 */
async function getUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AuthError('Failed to get user info', 'userinfo_error');
  }

  return response.json();
}

/**
 * Get current auth state from storage
 */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, userId: null, email: null, accessToken: null };
  }

  const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  const userId = localStorage.getItem(TOKEN_KEYS.USER_ID);
  const email = localStorage.getItem(TOKEN_KEYS.USER_EMAIL);
  const expiry = localStorage.getItem(TOKEN_KEYS.TOKEN_EXPIRY);

  // Check if token is expired
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    return { isAuthenticated: false, userId, email, accessToken: null };
  }

  return {
    isAuthenticated: !!accessToken,
    userId,
    email,
    accessToken,
  };
}

/**
 * Get access token, refreshing if needed
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const expiry = localStorage.getItem(TOKEN_KEYS.TOKEN_EXPIRY);
  const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);

  // If token expires in less than 60 seconds, refresh it
  if (expiry && Date.now() > parseInt(expiry, 10) - 60000) {
    return refreshAccessToken();
  }

  return accessToken;
}

// Storage helpers
function storeTokens(tokens: TokenResponse): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, tokens.access_token);
  localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  localStorage.setItem(
    TOKEN_KEYS.TOKEN_EXPIRY,
    String(Date.now() + tokens.expires_in * 1000)
  );
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(TOKEN_KEYS.USER_ID);
  localStorage.removeItem(TOKEN_KEYS.USER_EMAIL);
  localStorage.removeItem(TOKEN_KEYS.TOKEN_EXPIRY);
}

/**
 * Auth error class
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}
