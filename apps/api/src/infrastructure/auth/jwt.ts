/**
 * JWT utilities for OAuth 2.0 token management
 *
 * Uses jose library for JWT operations (ESM compatible)
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import * as jose from 'jose';
import type { AccessTokenPayload, RefreshTokenPayload } from '@nexus/shared';
import { randomUUID } from 'crypto';

// Token expiration constants
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '24h';
const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 24 * 60 * 60;

// Get JWT secret from environment (must be at least 32 bytes for HS256)
const getSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

const ISSUER = process.env.JWT_ISSUER || 'nexus-api';
const AUDIENCE = process.env.JWT_AUDIENCE || 'nexus-app';

/**
 * Sign an access token
 */
export async function signAccessToken(payload: {
  userId: string;
  email: string;
  roles?: string[];
}): Promise<string> {
  const secret = getSecret();

  return new jose.SignJWT({
    email: payload.email,
    roles: payload.roles || ['user'],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(secret);
}

/**
 * Sign a refresh token
 */
export async function signRefreshToken(userId: string): Promise<{
  token: string;
  jti: string;
  expiresAt: number;
}> {
  const secret = getSecret();
  const jti = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_SECONDS;

  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(secret);

  return { token, jti, expiresAt };
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload> {
  const secret = getSecret();

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    roles: payload.roles as string[],
    iat: payload.iat as number,
    exp: payload.exp as number,
  };
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload> {
  const secret = getSecret();

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return {
    sub: payload.sub as string,
    jti: payload.jti as string,
    iat: payload.iat as number,
    exp: payload.exp as number,
  };
}

/**
 * Get token expiry times in seconds
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN_SECONDS,
  REFRESH_TOKEN_SECONDS,
} as const;
