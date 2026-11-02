// The ownership rule of every write on /users/:id: one's own account only.
import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';

/**
 * Throws 403 when `id` is not the caller's own account: the subject asks for
 * a 403 when someone edits another user's profile. Called after `ParseIdPipe`,
 * so a malformed id is still a 400 first.
 *
 * @throws {ForbiddenException} 403 on another user's id.
 */
export function assertOwnAccount(user: AuthUser, id: number): void {
  if (user.id !== id) {
    throw new ForbiddenException();
  }
}
