// The profile write both profile forms share.
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';
import type { User } from '../auth/auth-types';
import { updateProfile, type ProfileChanges } from './users-actions';

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
