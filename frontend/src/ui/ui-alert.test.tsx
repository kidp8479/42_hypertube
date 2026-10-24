// Spec for Alert: the announcement role follows the tone.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './ui-alert';

describe('Alert', () => {
  it('announces an error at once', () => {
    render(<Alert tone="error">Wrong password</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password');
  });

  it('announces a success politely', () => {
    render(<Alert tone="success">Account created</Alert>);

    expect(screen.getByRole('status')).toHaveTextContent('Account created');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
