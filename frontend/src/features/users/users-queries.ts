// The profile write both profile forms share.
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';
import type { User } from '../auth/auth-types';
import {
  removePicture,
  updateProfile,
  uploadPicture,
  type ProfileChanges,
} from './users-actions';

/**
 * Saves changes to `user`'s profile and hands the saved profile to the auth
 * context, so the header and every page show it at once. Through a mutation,
 * so a 401 that survives the token refresh reaches the session-expired net
 * (lib/query-client.ts).
 */
export function useUpdateProfile(user: User) {
  const { updateUser } = useAuth();
  const { mutateAsync } = useMutation({
    mutationFn: (changes: ProfileChanges) => updateProfile(user.id, changes),
    onSuccess: (saved) => updateUser(saved),
  });
  return mutateAsync;
}

/**
 * The picture writes, `upload(file)` and `remove()`, each handing the saved
 * profile to the auth context like {@link useUpdateProfile}.
 */
export function usePictureWrites(user: User) {
  const { updateUser } = useAuth();
  const upload = useMutation({
    mutationFn: (file: File) => uploadPicture(user.id, file),
    onSuccess: (saved) => updateUser(saved),
  });
  const remove = useMutation({
    mutationFn: () => removePicture(user.id),
    onSuccess: (saved) => updateUser(saved),
  });
  return {
    upload: upload.mutateAsync,
    remove: remove.mutateAsync,
    isPending: upload.isPending || remove.isPending,
  };
}
