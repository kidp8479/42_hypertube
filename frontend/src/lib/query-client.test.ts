// Spec for the shared client's 401 net: a 401 from a query or a mutation
// reaches the registered handler, any other failure does not.
import { MutationObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';
import { queryClient, setUnauthorizedHandler } from './query-client';

// A fresh key per call, so no failure is served from the cache.
let queryCount = 0;

const failingQuery = (error: unknown) =>
  queryClient
    .query({
      queryKey: ['net', queryCount++],
      queryFn: () => Promise.reject(error),
    })
    .catch(() => undefined);

const failingMutation = (error: unknown) =>
  new MutationObserver(queryClient, {
    mutationFn: () => Promise.reject(error),
  })
    .mutate()
    .catch(() => undefined);

afterEach(() => {
  setUnauthorizedHandler(null);
});

describe('queryClient 401 net', () => {
  it.each([
    ['a query', failingQuery],
    ['a mutation', failingMutation],
  ])('hands a 401 from %s to the handler', async (_label, fail) => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await fail(new ApiError(401));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('leaves any other failure alone', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await failingQuery(new ApiError(403));
    await failingMutation(new TypeError('Failed to fetch'));

    expect(handler).not.toHaveBeenCalled();
  });
});
