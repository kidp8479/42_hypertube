// Spec for AppErrorBoundary: a page that throws while rendering shows the
// generic error and a reload button instead of a blank screen.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from './app-error-boundary';

function Broken(): never {
  throw new Error('render failed');
}

describe('AppErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>page content</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('replaces a page that throws with the error and a reload button', () => {
    // React reports the caught error on the console; expected here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Reload the page' }),
    ).toBeInTheDocument();
  });
});
