// Spec for the profile network calls: what they do with an empty answer.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateProfile } from './users-actions';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('updateProfile', () => {
  it('rejects a 204 rather than resolving to no profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(updateProfile(1, { firstName: 'Augusta' })).rejects.toThrow(
      'answered with no body',
    );
  });
});
