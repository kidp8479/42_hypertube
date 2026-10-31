// The profile page's picture form: upload a new picture, or remove it.
import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import type { FormOutcome } from '../auth/auth-account-form';
import { PictureField, type PicturePick } from '../auth/auth-picture-field';
import type { User } from '../auth/auth-types';
import { usePictureWrites } from './users-queries';

type Outcome =
  | 'picture.saved'
  | 'picture.removed'
  | 'picture.refused'
  | 'picture.tooLarge'
  | 'errors.generic';

// The backend reads the bytes: a file the browser took for an image can
// still be refused (400), and the size cap is checked again (413).
const REFUSALS: Partial<Record<number, Outcome>> = {
  400: 'picture.refused',
  413: 'picture.tooLarge',
};

const refusal = (caught: unknown): FormOutcome<Outcome> => ({
  key:
    (caught instanceof ApiError && REFUSALS[caught.status]) || 'errors.generic',
  tone: 'error',
});

/** Props of `PictureForm`. */
export interface PictureFormProps {
  /** The signed-in user, as last saved. */
  user: User;
}

/**
 * Uploads or removes one's own picture (`PUT` / `DELETE
 * /users/:id/picture`). Each write is sent on its own, apart from the
 * information form, since a file is not part of `PATCH /users/:id`.
 */
export function PictureForm({ user }: PictureFormProps) {
  const { t } = useTranslation('users');
  const writes = usePictureWrites(user);
  const [pick, setPick] = useState<PicturePick>({ file: null });
  const [outcome, setOutcome] = useState<FormOutcome<Outcome> | null>(null);
  const [resetKey, setResetKey] = useState(0);

  async function run(write: () => Promise<unknown>, done: Outcome) {
    setOutcome(null);
    try {
      await write();
      setOutcome({ key: done, tone: 'success' });
      setPick({ file: null });
      setResetKey((key) => key + 1);
    } catch (caught) {
      setOutcome(refusal(caught));
    }
  }

  function upload(event: SyntheticEvent) {
    event.preventDefault();
    const { file } = pick;
    if (file) {
      void run(() => writes.upload(file), 'picture.saved');
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={upload} noValidate>
      <h2 className="text-lg">{t('picture.title')}</h2>
      <PictureField
        hint={t('picture.hint')}
        onPick={setPick}
        resetKey={resetKey}
      />
      {outcome && <Alert tone={outcome.tone}>{t(outcome.key)}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="solid"
          disabled={writes.isPending || !pick.file}
        >
          {writes.isPending ? t('picture.uploading') : t('picture.upload')}
        </Button>
        {user.profilePicture && (
          <Button
            type="button"
            disabled={writes.isPending}
            onClick={() => void run(writes.remove, 'picture.removed')}
          >
            {t('picture.remove')}
          </Button>
        )}
      </div>
    </form>
  );
}
