// Unit tests for the shared account-form flow: validate, send, then the
// message (or the field errors) the form shows.
import type { SyntheticEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api';
import { useAccountForm, type AccountFormOptions } from './auth-account-form';

type Field = 'name';
type Values = Record<Field, string>;
type Key = 'saved' | 'taken';

const event = { preventDefault: () => {} } as SyntheticEvent;

function setup(options: Partial<AccountFormOptions<Field, Values, Key>>) {
  return renderHook(() =>
    useAccountForm<Field, Values, Key>({
      initialValues: { name: 'ada' },
      send: vi.fn(),
      ...options,
    }),
  );
}

describe('useAccountForm', () => {
  it('stops on a field error without sending', async () => {
    const send = vi.fn();
    const { result } = setup({
      validate: () => ({ name: { code: 'required' } }),
      send,
    });

    await act(() => result.current.submit(event));

    expect(send).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({ name: { code: 'required' } });
  });

  it('sends the current values, then shows the outcome and the new values', async () => {
    const send = vi.fn().mockResolvedValue({
      outcome: { key: 'saved', tone: 'success' },
      values: { name: 'grace' },
    });
    const { result } = setup({ send });

    act(() => result.current.setValue('name', 'augusta'));
    await act(() => result.current.submit(event));

    expect(send).toHaveBeenCalledWith({ name: 'augusta' });
    expect(result.current.outcome).toEqual({ key: 'saved', tone: 'success' });
    expect(result.current.values).toEqual({ name: 'grace' });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('maps a listed refusal status to its message', async () => {
    const { result } = setup({
      send: vi.fn().mockRejectedValue(new ApiError(409)),
      refusals: { 409: 'taken' },
    });

    await act(() => result.current.submit(event));

    expect(result.current.outcome).toEqual({ key: 'taken', tone: 'error' });
  });

  it.each([new ApiError(500), new TypeError('network down')])(
    'shows the generic message for %s',
    async (failure) => {
      const { result } = setup({
        send: vi.fn().mockRejectedValue(failure),
        refusals: { 409: 'taken' },
      });

      await act(() => result.current.submit(event));

      expect(result.current.outcome).toEqual({
        key: 'errors.generic',
        tone: 'error',
      });
      expect(result.current.isSubmitting).toBe(false);
    },
  );

  it('clears the last message when the form is sent again', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(409))
      .mockResolvedValueOnce(undefined);
    const { result } = setup({ send, refusals: { 409: 'taken' } });

    await act(() => result.current.submit(event));
    await act(() => result.current.submit(event));

    expect(result.current.outcome).toBeNull();
  });
});
