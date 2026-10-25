// Protected /profile route: the signed-in user edits their own account.
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/auth-context';
import { UserAvatar } from './users-avatar';
import { CredentialsForm } from './users-credentials-form';
import { InfoForm } from './users-info-form';

/**
 * The "my profile" page (subject III.1): every registration field is
 * editable here, the language through the header picker. Two forms, because
 * the email and the password need the current password and the rest does not.
 */
export function ProfilePage() {
  const { t } = useTranslation('users');
  const { state } = useAuth();
  // RequireAuth only renders this page once signed in.
  const user = state.user;
  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto my-12 flex max-w-md flex-col gap-10">
      <div className="flex items-center gap-4">
        <UserAvatar
          username={user.username}
          picture={user.profilePicture}
          size="lg"
        />
        <div>
          <h1 className="mb-1">{t('profile.title')}</h1>
          <p className="m-0 text-muted wrap-anywhere">{user.username}</p>
        </div>
      </div>
      <InfoForm user={user} />
      <CredentialsForm user={user} />
      <p className="m-0 text-muted">{t('profile.language')}</p>
    </div>
  );
}
