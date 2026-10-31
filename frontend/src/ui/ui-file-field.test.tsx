// Spec for FileField: named by its label, the app's words instead of the
// browser's, the picked file's name, and the error tied to the input.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileField } from './ui-file-field';

const texts = {
  label: 'Picture',
  chooseLabel: 'Choose a picture',
  emptyLabel: 'No picture chosen',
};

describe('FileField', () => {
  it('shows its own words until a file is picked, then the file name', async () => {
    const onFile = vi.fn();
    render(<FileField {...texts} onFile={onFile} />);
    const file = new File(['png'], 'me.png', { type: 'image/png' });

    expect(screen.getByText('No picture chosen')).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Picture'), file);

    expect(screen.getByText('me.png')).toBeInTheDocument();
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('describes the input by its error and marks it invalid', () => {
    render(
      <FileField {...texts} hint="2 MB" error="Too big" onFile={vi.fn()} />,
    );

    const input = screen.getByLabelText('Picture');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Too big');
  });
});
