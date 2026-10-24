// Spec for Button: the safe `type` default and the click behaviour.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './ui-button';

describe('Button', () => {
  it('does not submit a surrounding form unless asked to', async () => {
    const onSubmit = vi.fn((event: React.SyntheticEvent) =>
      event.preventDefault(),
    );
    render(
      <form onSubmit={onSubmit}>
        <Button>plain</Button>
        <Button type="submit">send</Button>
      </form>,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'plain' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'send' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('ignores a click while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        go
      </Button>,
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'go' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
