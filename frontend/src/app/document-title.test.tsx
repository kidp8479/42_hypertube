// Spec for useDocumentTitle: the tab title names the page, then the app.
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './document-title';

describe('useDocumentTitle', () => {
  it('names the page before the app', () => {
    renderHook(() => useDocumentTitle('Sign in'));

    expect(document.title).toBe('Sign in - Hypertube');
  });

  it('shows the app name alone for a page without a title', () => {
    document.title = 'Sign in - Hypertube';

    renderHook(() => useDocumentTitle());

    expect(document.title).toBe('Hypertube');
  });

  it('follows a title that changes, as on a language switch', () => {
    const { rerender } = renderHook(
      ({ page }: { page: string }) => useDocumentTitle(page),
      { initialProps: { page: 'Sign in' } },
    );

    rerender({ page: 'Connexion' });

    expect(document.title).toBe('Connexion - Hypertube');
  });
});
