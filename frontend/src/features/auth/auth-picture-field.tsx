// The profile picture file input the register form and the profile page share.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileField } from '../../ui/ui-file-field';
import {
  PICTURE_TYPES,
  describeValidationError,
  validatePicture,
  type ValidationError,
} from './auth-validation';

/** What the field holds: a file that passed the checks, or why the last pick failed. */
export interface PicturePick {
  file: File | null;
  error?: ValidationError;
}

/** Props of `PictureField`. */
export interface PictureFieldProps {
  hint: string;
  onPick: (pick: PicturePick) => void;
  /** Bump it to empty the input (after an upload). */
  resetKey?: number;
}

/**
 * A file input for a profile picture, checked as soon as a file is picked so
 * the error shows before any submit. A refused file is reported with its
 * error rather than dropped, so the form can refuse to send without it.
 */
export function PictureField({ hint, onPick, resetKey }: PictureFieldProps) {
  const { t } = useTranslation('auth');
  const [error, setError] = useState<ValidationError>();

  return (
    <FileField
      key={resetKey}
      label={t('fields.profilePicture')}
      chooseLabel={t('picture.choose')}
      emptyLabel={t('picture.empty')}
      accept={PICTURE_TYPES.join(',')}
      hint={hint}
      error={error && describeValidationError('profilePicture', error, t)}
      onFile={(file) => {
        const failure = file ? validatePicture(file) : undefined;
        setError(failure);
        onPick({ file: failure ? null : file, error: failure });
      }}
    />
  );
}
