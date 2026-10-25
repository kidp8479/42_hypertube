// Spec for apiFetch: body parsing, headers (token, Content-Type), ApiError
// on a non-ok response, and the refresh-and-retry on a 401.
import { describe, it, expect, vi } from 'vitest';
import { apiFetch, ApiError, refreshAccessToken } from './api';
import { getAuthToken, setAuthToken } from './token';

function stubFetch(status: number, body: unknown = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      text: async () => JSON.stringify(body),
    }),
  );
}

/**
 * A backend where `/auth/refresh` answers `refresh` (a token, or `null` for a
 * dead cookie) and any other route accepts only `Bearer <accepted>`.
 */
function stubBackend(refresh: string | null, accepted: string) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/auth/refresh') {
      return Promise.resolve(
        refresh
          ? {
              ok: true,
              status: 200,
              json: async () => ({ access_token: refresh }),
            }
          : { ok: false, status: 401 },
      );
    }
    const auth = new Headers(init?.headers).get('Authorization');
    const ok = auth === `Bearer ${accepted}`;
    return Promise.resolve({
      ok,
      status: ok ? 200 : 401,
      text: async () => JSON.stringify({ auth }),
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function refreshCalls(fetchMock: ReturnType<typeof stubBackend>) {
  return fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh')
    .length;
}

/** The `Headers` instance apiFetch passed to `fetch` on its last call. */
function sentHeaders(): Headers {
  return vi.mocked(fetch).mock.calls.at(-1)![1]!.headers as Headers;
}

describe('apiFetch', () => {
  it('returns the parsed JSON body on a 200 response', async () => {
    stubFetch(200, { id: 1, name: 'Inception' });

    const result = await apiFetch('/movies/1');

    expect(result).toEqual({ id: 1, name: 'Inception' });
  });

  it.each([204, 200])(
    'returns undefined on a %i response with an empty body',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status, text: async () => '' }),
      );

      const result = await apiFetch('/auth/logout', { method: 'POST' });

      expect(result).toBeUndefined();
    },
  );

  it('includes an Authorization header when a token is stored', async () => {
    setAuthToken('fake-token');
    stubFetch(200, { id: 1, name: 'Inception' });

    await apiFetch('/movies/1');

    expect(fetch).toHaveBeenCalledWith('/api/movies/1', expect.anything());
    expect(sentHeaders().get('Authorization')).toBe('Bearer fake-token');
  });

  it('sets a JSON Content-Type for a string body', async () => {
    stubFetch(200, { id: 1 });

    await apiFetch('/movies/1', {
      method: 'POST',
      body: JSON.stringify({ name: 'Inception' }),
    });

    expect(sentHeaders().get('Content-Type')).toBe('application/json');
  });

  it('does not force a JSON Content-Type for a FormData body', async () => {
    stubFetch(200, { id: 1 });

    await apiFetch('/movies/1', { method: 'POST', body: new FormData() });

    expect(sentHeaders().get('Content-Type')).toBeNull();
  });

  it('preserves caller headers passed as a Headers instance', async () => {
    stubFetch(200, {});

    await apiFetch('/movies/1', {
      headers: new Headers({ 'X-Trace-Id': 'abc' }),
    });

    expect(sentHeaders().get('X-Trace-Id')).toBe('abc');
  });

  it.each([400, 401, 404])(
    'throws an ApiError with status %i when the response is not ok',
    async (status) => {
      stubFetch(status, { message: 'error' });

      await expect(apiFetch('/movies/1')).rejects.toBeInstanceOf(ApiError);
      await expect(apiFetch('/movies/1')).rejects.toMatchObject({ status });
    },
  );
});

describe('apiFetch on a 401', () => {
  it('refreshes the token and retries the request with it', async () => {
    setAuthToken('expired');
    stubBackend('renewed', 'renewed');

    const result = await apiFetch('/users/me');

    expect(result).toEqual({ auth: 'Bearer renewed' });
    expect(getAuthToken()).toBe('renewed');
  });

  it('shares one refresh between requests that 401 at once', async () => {
    setAuthToken('expired');
    const fetchMock = stubBackend('renewed', 'renewed');

    await Promise.all([apiFetch('/users/me'), apiFetch('/movies')]);

    expect(refreshCalls(fetchMock)).toBe(1);
  });

  it('drops the token and throws the 401 when the refresh fails', async () => {
    setAuthToken('expired');
    stubBackend(null, 'never');

    await expect(apiFetch('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(getAuthToken()).toBeNull();
  });

  it('retries with the current token, without refreshing, when it changed meanwhile', async () => {
    setAuthToken('old');
    const fetchMock = stubBackend('unused', 'new');
    fetchMock.mockImplementationOnce(() => {
      // A login lands while the request with the old token is in flight.
      setAuthToken('new');
      return Promise.resolve({ ok: false, status: 401 } as never);
    });

    const result = await apiFetch('/users/me');

    expect(result).toEqual({ auth: 'Bearer new' });
    expect(refreshCalls(fetchMock)).toBe(0);
  });

  it('does not refresh when the request carried no token', async () => {
    const fetchMock = stubBackend('renewed', 'renewed');

    await expect(apiFetch('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls(fetchMock)).toBe(0);
  });

  it('does not refresh on an auth route, whose 401 is the answer', async () => {
    setAuthToken('expired');
    const fetchMock = stubBackend('renewed', 'renewed');

    await expect(
      apiFetch('/auth/login', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls(fetchMock)).toBe(0);
  });
});

describe('refreshAccessToken', () => {
  it('lets a sign-in that lands while it is in flight win', async () => {
    setAuthToken('expired');
    stubBackend('renewed', 'renewed');

    const pending = refreshAccessToken();
    setAuthToken('signed-in-meanwhile');

    await expect(pending).resolves.toBe('signed-in-meanwhile');
    expect(getAuthToken()).toBe('signed-in-meanwhile');
  });

  it('reads a 204 (no cookie) as no session', async () => {
    setAuthToken('expired');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 }),
    );

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(getAuthToken()).toBeNull();
  });

  it('throws on a 5xx without ending the session', async () => {
    setAuthToken('expired');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(refreshAccessToken()).rejects.toMatchObject({ status: 503 });
    expect(getAuthToken()).toBe('expired');
  });
});
