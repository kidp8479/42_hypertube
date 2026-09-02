import * as argon2 from 'argon2';

/**
 * Single source of truth for password-hash parameters (ADR-0001).
 *
 * Pinned explicitly rather than left to the library defaults so the cost
 * cannot drift on a dependency bump, and so the login dummy-hash check
 * (AuthService) spends exactly the same work as a real verification.
 *
 * Values are the OWASP argon2id recommendation for a memory-constrained
 * host: m = 19 MiB, t = 2, p = 1.
 */
export const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
