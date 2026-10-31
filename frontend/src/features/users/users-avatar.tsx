// A user's round picture, or their initial when there is none.
import { useState } from 'react';
import { API_BASE } from '../../lib/api';

const SIZES = { sm: 'size-6 text-xs', lg: 'size-20 text-lg' } as const;

/** Props of `UserAvatar`. */
export interface UserAvatarProps {
  username: string;
  /** The stored picture's name (`User.profilePicture`), or `null` for none. */
  picture: string | null;
  size?: keyof typeof SIZES;
}

/**
 * Shows the profile picture the backend hosts (`GET /pictures/:name`), or
 * the username's initial when there is none: that initial is the default
 * avatar. A picture that fails to load falls back to the initial too.
 */
export function UserAvatar({
  username,
  picture,
  size = 'sm',
}: UserAvatarProps) {
  // The picture that failed, so a new one gets its own try.
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const frame = `inline-flex flex-none items-center justify-center overflow-hidden ${SIZES[size]} rounded-round border border-edge`;

  if (picture && picture !== failedPicture) {
    return (
      <img
        src={`${API_BASE}/pictures/${encodeURIComponent(picture)}`}
        alt=""
        className={`${frame} object-cover`}
        onError={() => setFailedPicture(picture)}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${frame} font-mono uppercase`}>
      {username.charAt(0)}
    </span>
  );
}
