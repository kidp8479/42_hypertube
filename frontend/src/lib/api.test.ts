import { describe, it, expect, vi } from 'vitest';
import { apiFetch, ApiError } from './api';
import { setAuthToken } from './token';

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

    expect(fetch).toHaveBeenCalledWith(
      '/api/movies/1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
        }),
      }),
    );
  });

  it('includes a Content-Type header when a body is provided', async () => {
    stubFetch(200, { id: 1, name: 'Inception' });

    await apiFetch('/movies/1', {
      method: 'POST',
      body: JSON.stringify({ name: 'Inception' }),
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/movies/1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
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
