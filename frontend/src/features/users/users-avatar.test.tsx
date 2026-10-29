// Spec for UserAvatar: the picture, and the initial when there is none or it
// fails to load.
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { UserAvatar } from './users-avatar';

const picture = 'https://example.com/a.png';

describe('UserAvatar', () => {
  it('shows the initial when there is no picture', () => {
    const { container } = render(<UserAvatar username="ada" picture={null} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('a');
  });

  it('falls back to the initial when the picture fails to load', () => {
    const { container } = render(
      <UserAvatar username="ada" picture={picture} />,
    );
    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('a');
  });

  it('gives a new address its own try after a failed one', () => {
    const { container, rerender } = render(
      <UserAvatar username="ada" picture={picture} />,
    );
    fireEvent.error(container.querySelector('img')!);

    rerender(<UserAvatar username="ada" picture="https://example.com/b.png" />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/b.png',
    );
  });
});
