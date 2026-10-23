// Unit spec for the refresh token primitives: a random secret for the cookie,
// and the hash the database keeps instead of it.
import {
  generateRefreshSecret,
  hashRefreshSecret,
} from './refresh-secret.util';

describe('refresh secret', () => {
  it('is 256 random bits, URL-safe, and different every time', () => {
    const a = generateRefreshSecret();
    const b = generateRefreshSecret();

    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('hashes to a stable 64 character hex SHA-256 that does not contain the secret', () => {
    const secret = generateRefreshSecret();

    const hash = hashRefreshSecret(secret);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshSecret(secret)).toBe(hash);
    expect(hash).not.toContain(secret);
  });

  it('gives a different hash for a different secret', () => {
    expect(hashRefreshSecret('a')).not.toBe(hashRefreshSecret('b'));
  });
});
