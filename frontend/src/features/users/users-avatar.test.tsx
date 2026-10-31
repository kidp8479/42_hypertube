// Spec for UserAvatar: the picture, and the initial when there is none or it
// fails to load.
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { UserAvatar } from './users-avatar';

const picture = '3f2b8c1e-6d4a-4b7e-9a51-0c2d7e8f9a10.png';

describe('UserAvatar', () => {
  it('shows the initial when there is no picture', () => {
    const { container } = render(<UserAvatar username="ada" picture={null} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('a');
  });

  it('loads the stored picture from the API', () => {
    const { container } = render(
      <UserAvatar username="ada" picture={picture} />,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      `/api/pictures/${picture}`,
    );
  });

  it('falls back to the initial when the picture fails to load', () => {
    const { container } = render(
      <UserAvatar username="ada" picture={picture} />,
    );
    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('a');
  });

  it('gives a new picture its own try after a failed one', () => {
    const { container, rerender } = render(
      <UserAvatar username="ada" picture={picture} />,
    );
    fireEvent.error(container.querySelector('img')!);

    rerender(<UserAvatar username="ada" picture="b.png" />);

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/pictures/b.png',
    );
  });
});
