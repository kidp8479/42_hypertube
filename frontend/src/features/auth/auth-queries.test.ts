// Unit tests for when the startup session check retries.
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import { retryBootstrap } from './auth-queries';

describe('retryBootstrap', () => {
  it.each([400, 401, 403, 404])(
    'never retries a %i, a real answer',
    (status) => {
      expect(retryBootstrap(0, new ApiError(status))).toBe(false);
    },
  );

  it.each([
    ['a 5xx', new ApiError(503)],
    ['a network drop', new TypeError('Failed to fetch')],
  ])('retries %s twice, then gives up', (_label, error) => {
    expect(retryBootstrap(0, error)).toBe(true);
    expect(retryBootstrap(1, error)).toBe(true);
    expect(retryBootstrap(2, error)).toBe(false);
  });
});
