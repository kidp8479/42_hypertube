// Spec for the auth actions with network side effects: register payload, the
// OAuth code exchange error mapping, and a login waiting for a refresh.
import { describe, it, expect, vi } from 'vitest';

// Replace only `apiFetch`; keep the real `ApiError` class so `instanceof`
// checks elsewhere still match, matching auth-provider.test.tsx's pattern.
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}));
const { apiFetch, ApiError, refreshAccessToken } =
  await import('../../lib/api');
const apiFetchMock = vi.mocked(apiFetch);

const {
  registerRequest,
  exchangeOAuthCode,
  loginRequest,
  OAuthCodeRejectedError,
} = await import('./auth-actions');
const { setAuthToken, getAuthToken, removeAuthToken } =
  await import('../../lib/token');

describe('registerRequest', () => {
  it('posts the trimmed CreateUserDto fields to /users, dropping confirmPassword', async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);

    await registerRequest(
      {
        email: '  ada@example.com  ',
        username: '  adalovelace  ',
        firstName: '  Ada  ',
        lastName: '  Lovelace  ',
        password: 'correct horse',
        confirmPassword: 'correct horse',
      },
      'fr',
    );

    expect(apiFetchMock).toHaveBeenCalledWith('/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ada@example.com',
        password: 'correct horse',
        username: 'adalovelace',
        lastName: 'Lovelace',
        firstName: 'Ada',
        preferredLanguage: 'fr',
      }),
    });
  });

  it('never stores a token - registering does not log the user in', async () => {
    removeAuthToken();
    apiFetchMock.mockResolvedValueOnce(undefined);

    await registerRequest(
      {
        email: 'ada@example.com',
        username: 'adalovelace',
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'correct horse',
        confirmPassword: 'correct horse',
      },
      'en',
    );

    expect(getAuthToken()).toBeNull();
  });

  it('propagates a rejection (e.g. a 409 conflict) without storing a token', async () => {
    setAuthToken('unrelated-token-from-a-prior-session');
    const conflict = new Error('conflict');
    apiFetchMock.mockRejectedValueOnce(conflict);

    await expect(
      registerRequest(
        {
          email: 'ada@example.com',
          username: 'adalovelace',
          firstName: 'Ada',
          lastName: 'Lovelace',
          password: 'correct horse',
          confirmPassword: 'correct horse',
        },
        'en',
      ),
    ).rejects.toBe(conflict);

    // Unrelated to this call's own (failed) token handling, but pins down
    // that a failed register doesn't clear a session the user already had.
    expect(getAuthToken()).toBe('unrelated-token-from-a-prior-session');
    removeAuthToken();
  });
});

describe('exchangeOAuthCode', () => {
  it('turns the exchange 401 into OAuthCodeRejectedError', async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiError(401));

    await expect(exchangeOAuthCode('used-code')).rejects.toBeInstanceOf(
      OAuthCodeRejectedError,
    );
  });

  it('passes any other failure through untouched', async () => {
    const outage = new ApiError(503);
    apiFetchMock.mockRejectedValueOnce(outage);

    await expect(exchangeOAuthCode('any-code')).rejects.toBe(outage);
  });
});

describe('loginRequest', () => {
  it('waits for the refresh in flight, whose failure clears the cookie', async () => {
    let answerRefresh: (response: object) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            answerRefresh = resolve;
          }),
      ),
    );
    apiFetchMock.mockResolvedValueOnce({ access_token: 'fresh-token' });

    const refresh = refreshAccessToken();
    const login = loginRequest('ada', 'correct horse');
    await Promise.resolve();
    expect(apiFetchMock).not.toHaveBeenCalled();

    answerRefresh({ ok: false, status: 401 });
    await Promise.all([refresh, login]);

    expect(apiFetchMock).toHaveBeenCalledWith('/auth/login', expect.anything());
    expect(getAuthToken()).toBe('fresh-token');
  });
});
