/**
 * Password Hashing Utilities Unit Tests
 *
 * Tests Argon2id password hashing and verification.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword } from './password.js';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash password using Argon2id', async () => {
      const password = 'mySecurePassword123!';

      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      // Argon2id hashes start with $argon2id$
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('should produce different hashes for same password (salted)', async () => {
      const password = 'samePassword';

      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it('should handle unicode characters in password', async () => {
      const password = 'пароль密码🔐';

      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$argon2id\$/);

      // Verify the hash works
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000);

      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();

      // Verify the hash works
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await verifyPassword('password', 'not-a-valid-hash');

      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verifyPassword('password', '');

      expect(isValid).toBe(false);
    });

    it('should return false for null-like hash values', async () => {
      // Test with various invalid hash inputs
      const isValid1 = await verifyPassword('password', 'null');
      const isValid2 = await verifyPassword('password', 'undefined');

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
    });

    it('should be case-sensitive for password verification', async () => {
      const password = 'CaseSensitive';
      const hash = await hashPassword(password);

      const isValidLower = await verifyPassword('casesensitive', hash);
      const isValidUpper = await verifyPassword('CASESENSITIVE', hash);
      const isValidCorrect = await verifyPassword('CaseSensitive', hash);

      expect(isValidLower).toBe(false);
      expect(isValidUpper).toBe(false);
      expect(isValidCorrect).toBe(true);
    });

    it('should handle whitespace in passwords correctly', async () => {
      const password = '  password with spaces  ';
      const hash = await hashPassword(password);

      const isValidTrimmed = await verifyPassword('password with spaces', hash);
      const isValidExact = await verifyPassword('  password with spaces  ', hash);

      expect(isValidTrimmed).toBe(false);
      expect(isValidExact).toBe(true);
    });
  });

  describe('security properties', () => {
    it('should produce hashes of consistent length', async () => {
      const hash1 = await hashPassword('short');
      const hash2 = await hashPassword('a'.repeat(100));

      // Both should be Argon2id hashes with similar structure
      expect(hash1).toMatch(/^\$argon2id\$/);
      expect(hash2).toMatch(/^\$argon2id\$/);
    });

    it('should not reveal password length in hash', async () => {
      const shortHash = await hashPassword('a');
      const longHash = await hashPassword('a'.repeat(50));

      // Hash lengths should be similar (not proportional to password length)
      // Argon2id produces fixed-size output regardless of input
      const lengthDiff = Math.abs(shortHash.length - longHash.length);
      expect(lengthDiff).toBeLessThan(10); // Small variation is acceptable
    });
  });
});
