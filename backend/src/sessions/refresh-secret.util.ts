import { createHash, randomBytes } from 'node:crypto';

/**
 * A new refresh token secret: 256 random bits, URL-safe so it fits a cookie
 * value as is. Only the browser's cookie ever holds it.
 */
export function generateRefreshSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * What the database stores instead of the secret: its hex SHA-256. A fast
 * hash is enough, unlike for a password: the secret is 256 random bits, so
 * there is nothing to guess offline, and a lookup by hash needs it to be
 * deterministic (a salted slow hash could not be searched).
 */
export function hashRefreshSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
