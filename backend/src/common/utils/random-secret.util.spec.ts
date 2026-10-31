// Unit spec for the secret primitives: a random secret, and the hash the
// database keeps instead of it.
import { generateSecret, hashSecret } from './random-secret.util';

describe('random secret', () => {
  it('is 256 random bits, URL-safe, and different every time', () => {
    const a = generateSecret();
    const b = generateSecret();

    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('hashes to a stable 64 character hex SHA-256 that does not contain the secret', () => {
    const secret = generateSecret();

    const hash = hashSecret(secret);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSecret(secret)).toBe(hash);
    expect(hash).not.toContain(secret);
  });

  it('gives a different hash for a different secret', () => {
    expect(hashSecret('a')).not.toBe(hashSecret('b'));
  });
});
