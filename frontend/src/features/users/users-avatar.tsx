// A user's round picture, or their initial when there is none.
import { useState } from 'react';

const SIZES = { sm: 'size-6 text-xs', lg: 'size-20 text-lg' } as const;

/**
 * Shows the profile picture, falling back to the username's initial when
 * there is none or it fails to load. The picture is an address the user
 * typed, on someone else's server: `no-referrer` keeps the page we are on
 * from leaking to it.
 */
export function UserAvatar({
  username,
  picture,
  size = 'sm',
}: {
  username: string;
  picture: string | null;
  size?: keyof typeof SIZES;
}) {
  // The address that failed, so a new address gets its own try.
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const frame = `inline-flex flex-none items-center justify-center overflow-hidden rounded-round border border-edge ${SIZES[size]}`;

  if (picture && picture !== failedPicture) {
    return (
      <img
        src={picture}
        alt=""
        referrerPolicy="no-referrer"
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
