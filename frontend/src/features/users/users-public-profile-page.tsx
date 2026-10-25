// Protected /users/:id route: another user's public profile.
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NotFoundPage } from '../../app/app-not-found-page';
import { ApiError } from '../../lib/api';
import { Alert } from '../../ui/ui-alert';
import { useAuth } from '../auth/auth-context';
import { fetchPublicUser } from './users-actions';
import { UserAvatar } from './users-avatar';

/**
 * Shows another user's username and picture, never their email (subject
 * III.1, III.4). One's own id (or `me`) goes to `/profile`, since the API
 * would answer it with the full profile. A malformed id (400) or an unknown one (404) is
 * the 404 page.
 */
export function PublicProfilePage() {
  const { t } = useTranslation('users');
  const { id = '' } = useParams();
  const { state } = useAuth();
  const isOwn =
    id === 'me' || (state.user !== null && String(state.user.id) === id);
  const profile = useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchPublicUser(id),
    enabled: !isOwn,
  });

  if (isOwn) {
    return <Navigate to="/profile" replace />;
  }
  if (profile.isPending) {
    return (
      <p role="status" className="my-12 text-center text-muted">
        {t('publicProfile.loading')}
      </p>
    );
  }
  if (profile.isError) {
    const { error } = profile;
    const notFound =
      error instanceof ApiError &&
      (error.status === 400 || error.status === 404);
    return notFound ? (
      <NotFoundPage />
    ) : (
      <div className="mx-auto my-12 max-w-md">
        <Alert tone="error">{t('errors.generic')}</Alert>
      </div>
    );
  }

  const user = profile.data;
  return (
    <div className="mx-auto my-12 flex max-w-md items-center gap-4">
      <UserAvatar
        username={user.username}
        picture={user.profilePicture}
        size="lg"
      />
      <h1 className="m-0 wrap-anywhere">{user.username}</h1>
    </div>
  );
}
