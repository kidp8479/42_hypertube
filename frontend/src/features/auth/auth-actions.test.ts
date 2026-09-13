import { describe, it, expect, vi } from 'vitest';

// Replace only `apiFetch`; keep the real `ApiError` class so `instanceof`
// checks elsewhere still match, matching auth-provider.test.tsx's pattern.
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}));
const { apiFetch } = await import('../../lib/api');
const apiFetchMock = vi.mocked(apiFetch);

const { registerRequest } = await import('./auth-actions');
const { setAuthToken, getAuthToken, removeAuthToken } =
  await import('../../lib/token');

describe('registerRequest', () => {
  it('posts the trimmed CreateUserDto fields to /users, dropping confirmPassword', async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);

    await registerRequest({
      email: '  ada@example.com  ',
      username: '  adalovelace  ',
      firstName: '  Ada  ',
      lastName: '  Lovelace  ',
      password: 'correct horse',
      confirmPassword: 'correct horse',
    });

    expect(apiFetchMock).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ada@example.com',
        password: 'correct horse',
        username: 'adalovelace',
        lastName: 'Lovelace',
        firstName: 'Ada',
      }),
    });
  });

  it('never stores a token - registering does not log the user in', async () => {
    removeAuthToken();
    apiFetchMock.mockResolvedValueOnce(undefined);

    await registerRequest({
      email: 'ada@example.com',
      username: 'adalovelace',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'correct horse',
      confirmPassword: 'correct horse',
    });

    expect(getAuthToken()).toBeNull();
  });

  it('propagates a rejection (e.g. a 409 conflict) without storing a token', async () => {
    setAuthToken('unrelated-token-from-a-prior-session');
    const conflict = new Error('conflict');
    apiFetchMock.mockRejectedValueOnce(conflict);

    await expect(
      registerRequest({
        email: 'ada@example.com',
        username: 'adalovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'correct horse',
        confirmPassword: 'correct horse',
      }),
    ).rejects.toBe(conflict);

    // Unrelated to this call's own (failed) token handling, but pins down
    // that a failed register doesn't clear a session the user already had.
    expect(getAuthToken()).toBe('unrelated-token-from-a-prior-session');
    removeAuthToken();
  });
});
