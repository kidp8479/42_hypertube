// Spec for Field: the label, hint and error are tied to the input.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './ui-field';

describe('Field', () => {
  it('names the input by its label and describes it by the hint', () => {
    render(<Field label="Email" hint="We never share it" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('shows the error instead of the hint and marks the input invalid', () => {
    render(<Field label="Email" hint="We never share it" error="Required" />);

    const input = screen.getByLabelText('Email');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Required');
    expect(screen.queryByText('We never share it')).not.toBeInTheDocument();
  });

  it('marks the input invalid without a message of its own', () => {
    render(<Field label="Email" invalid />);

    expect(screen.getByLabelText('Email')).toBeInvalid();
  });

  it('keeps the description the caller passes', () => {
    render(
      <>
        <p id="rules">At least 8 characters</p>
        <Field label="Password" aria-describedby="rules" error="Too short" />
      </>,
    );

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters Too short',
    );
  });

  it('forwards native input attributes', () => {
    render(<Field label="Password" type="password" autoComplete="off" />);

    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    );
  });
});
