// Protected /users/:id route: another user's public profile.
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../../app/document-title';
import { LoadingStatus } from '../../app/app-loading';
import { NotFoundPage } from '../../app/app-not-found-page';
import { ApiError } from '../../lib/api';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { useAuth } from '../auth/auth-context';
import { fetchPublicUser } from './users-actions';
import { UserAvatar } from './users-avatar';

export interface ProfileLoadErrorProps {
  error: Error;
  onRetry: () => void;
}

/**
 * Why a profile did not load: a malformed id (400) or an unknown one (404)
 * is the 404 page, anything else a message with a retry.
 */
function ProfileLoadError({ error, onRetry }: ProfileLoadErrorProps) {
  const { t } = useTranslation('users');
  const notFound =
    error instanceof ApiError && (error.status === 400 || error.status === 404);
  if (notFound) {
    return <NotFoundPage />;
  }
  return (
    <div className="flex flex-col mx-auto my-12 gap-4 max-w-md">
      <Alert tone="error">{t('errors.generic')}</Alert>
      <Button variant="outline" onClick={onRetry}>
        {t('errors.retry')}
      </Button>
    </div>
  );
}

/**
 * Shows another user's username and picture, never their email (subject
 * III.1, III.4). One's own id (or `me`) goes to `/profile`, since the API
 * would answer it with the full profile. A malformed id (400) or an unknown one (404) is
 * the 404 page.
 */
export function PublicProfilePage() {
  const { id = '' } = useParams();
  const { state } = useAuth();
  const isOwn =
    id === 'me' || (state.user !== null && String(state.user.id) === id);
  const profile = useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchPublicUser(id),
    enabled: !isOwn,
  });
  // Set only once the profile is in: the 404 page shown for an unknown id
  // sets its own title, and this one does not run again to overwrite it.
  useDocumentTitle(profile.data?.username);

  if (isOwn) {
    return <Navigate to="/profile" replace />;
  }
  if (profile.isPending) {
    return <LoadingStatus />;
  }
  if (profile.isError) {
    return (
      <ProfileLoadError
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  const user = profile.data;
  return (
    <div className="flex items-center mx-auto my-12 gap-4 max-w-md">
      <UserAvatar
        username={user.username}
        picture={user.profilePicture}
        size="lg"
      />
      <h1 className="m-0 wrap-anywhere">{user.username}</h1>
    </div>
  );
}
