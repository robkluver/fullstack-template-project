/**
 * JWT Utilities Unit Tests
 *
 * Tests token signing and verification for OAuth 2.0 flows.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  TOKEN_EXPIRY,
} from './jwt.js';

describe('JWT Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-26T10:00:00.000Z'));

    // Set test JWT secret (must be at least 32 bytes for HS256)
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key-at-least-32-bytes-long-for-hs256',
      JWT_ISSUER: 'nexus-api',
      JWT_AUDIENCE: 'nexus-app',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe('signAccessToken', () => {
    it('should create valid access token with correct claims', async () => {
      const payload = {
        userId: 'usr_123',
        email: 'user@example.com',
        roles: ['user', 'admin'],
      };

      const token = await signAccessToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature

      // Verify token structure
      const decoded = await verifyAccessToken(token);
      expect(decoded.sub).toBe('usr_123');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.roles).toEqual(['user', 'admin']);
    });

    it('should set default roles to ["user"] if not provided', async () => {
      const payload = {
        userId: 'usr_123',
        email: 'test@example.com',
      };

      const token = await signAccessToken(payload);
      const decoded = await verifyAccessToken(token);

      expect(decoded.roles).toEqual(['user']);
    });

    it('should include iat (issued at) claim', async () => {
      const token = await signAccessToken({
        userId: 'usr_123',
        email: 'test@example.com',
      });

      const decoded = await verifyAccessToken(token);
      const expectedIat = Math.floor(new Date('2025-11-26T10:00:00.000Z').getTime() / 1000);

      expect(decoded.iat).toBe(expectedIat);
    });

    it('should set expiration to 15 minutes from now', async () => {
      const token = await signAccessToken({
        userId: 'usr_123',
        email: 'test@example.com',
      });

      const decoded = await verifyAccessToken(token);
      const expectedExp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY.ACCESS_TOKEN_SECONDS;

      expect(decoded.exp).toBe(expectedExp);
    });

    it('should throw if JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;

      await expect(
        signAccessToken({ userId: 'usr_123', email: 'test@example.com' })
      ).rejects.toThrow('JWT_SECRET environment variable is required');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode valid token', async () => {
      const token = await signAccessToken({
        userId: 'usr_456',
        email: 'verify@example.com',
        roles: ['user'],
      });

      const decoded = await verifyAccessToken(token);

      expect(decoded.sub).toBe('usr_456');
      expect(decoded.email).toBe('verify@example.com');
      expect(decoded.roles).toEqual(['user']);
    });

    it('should reject expired token', async () => {
      const token = await signAccessToken({
        userId: 'usr_123',
        email: 'test@example.com',
      });

      // Advance time by 16 minutes (past 15 min expiry)
      jest.advanceTimersByTime(16 * 60 * 1000);

      await expect(verifyAccessToken(token)).rejects.toThrow();
    });

    it('should reject token with invalid signature', async () => {
      // Create a token with a different secret
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'different-secret-key-at-least-32-bytes-long';

      const token = await signAccessToken({
        userId: 'usr_123',
        email: 'test@example.com',
      });

      // Restore original secret and try to verify
      process.env.JWT_SECRET = originalSecret;

      await expect(verifyAccessToken(token)).rejects.toThrow();
    });

    it('should reject malformed token', async () => {
      await expect(verifyAccessToken('not-a-valid-jwt')).rejects.toThrow();
    });

    it('should reject token with tampered payload', async () => {
      const token = await signAccessToken({
        userId: 'usr_123',
        email: 'test@example.com',
      });

      // Tamper with the payload (second part of JWT)
      const parts = token.split('.');
      parts[1] = Buffer.from('{"sub":"hacked","email":"hacker@evil.com"}').toString('base64url');
      const tamperedToken = parts.join('.');

      await expect(verifyAccessToken(tamperedToken)).rejects.toThrow();
    });
  });

  describe('signRefreshToken', () => {
    it('should create refresh token with jti', async () => {
      const result = await signRefreshToken('usr_123');

      expect(result.token).toBeTruthy();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);

      // jti should be a UUID
      expect(result.jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // expiresAt should be in the future
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should set expiration to 24 hours', async () => {
      const result = await signRefreshToken('usr_123');

      const expectedExp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS;
      expect(result.expiresAt).toBe(expectedExp);
    });

    it('should generate unique jti for each token', async () => {
      const result1 = await signRefreshToken('usr_123');
      const result2 = await signRefreshToken('usr_123');

      expect(result1.jti).not.toBe(result2.jti);
    });

    it('should include user ID in sub claim', async () => {
      const result = await signRefreshToken('usr_789');

      const decoded = await verifyRefreshToken(result.token);
      expect(decoded.sub).toBe('usr_789');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode valid refresh token', async () => {
      const { token, jti } = await signRefreshToken('usr_123');

      const decoded = await verifyRefreshToken(token);

      expect(decoded.sub).toBe('usr_123');
      expect(decoded.jti).toBe(jti);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should reject expired refresh token', async () => {
      const { token } = await signRefreshToken('usr_123');

      // Advance time by 25 hours (past 24 hour expiry)
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);

      await expect(verifyRefreshToken(token)).rejects.toThrow();
    });

    it('should extract jti from payload', async () => {
      const { token, jti } = await signRefreshToken('usr_123');

      const decoded = await verifyRefreshToken(token);

      expect(decoded.jti).toBe(jti);
    });
  });

  describe('TOKEN_EXPIRY constants', () => {
    it('should have correct access token expiry', () => {
      expect(TOKEN_EXPIRY.ACCESS_TOKEN_SECONDS).toBe(15 * 60); // 15 minutes
    });

    it('should have correct refresh token expiry', () => {
      expect(TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS).toBe(24 * 60 * 60); // 24 hours
    });
  });
});
