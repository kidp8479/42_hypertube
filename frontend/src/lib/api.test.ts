import { describe, it, expect, vi } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
  it('returns the parsed JSON body on a 200 response', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: 1, name: 'Inception' }),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const result = await apiFetch('/movies/1');

    expect(result).toEqual({ id: 1, name: 'Inception' });
  });

  it('returns undefined on a 204 response', async () => {
    const fakeResponse = {
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('Unexpected end of JSON input');
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const result = await apiFetch('/movies/1');

    expect(result).toBeUndefined();
  });
});
