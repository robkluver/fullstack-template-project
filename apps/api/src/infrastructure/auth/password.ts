/**
 * Password hashing utilities using Argon2id
 *
 * Argon2id is the recommended algorithm for password hashing
 * as it provides resistance against both GPU and side-channel attacks.
 *
 * @see docs/core/AUTH_STRATEGY.md
 */

import { hash, verify } from '@node-rs/argon2';

// Argon2id configuration per OWASP recommendations
const ARGON2_OPTIONS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await verify(hashedPassword, password);
  } catch {
    // Invalid hash format or other error
    return false;
  }
}
