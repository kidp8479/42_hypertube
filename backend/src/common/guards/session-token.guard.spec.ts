// Unit spec for SessionTokenGuard: a login token passes, a token bought with an
// API key is a 403, and the routes ADR-0015 names carry the guard.
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { AuthUser } from '../decorators/current-user.decorator';
import { SessionTokenGuard } from './session-token.guard';
import { UsersController } from '../../users/users.controller';
import { ApiClientsController } from '../../api-clients/api-clients.controller';

const contextFor = (user: AuthUser) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('SessionTokenGuard', () => {
  const guard = new SessionTokenGuard();

  it('lets a login token through', () => {
    expect(guard.canActivate(contextFor({ id: 7 }))).toBe(true);
  });

  it('refuses a token bought with an API key (403)', () => {
    expect(() =>
      guard.canActivate(contextFor({ id: 7, apiClientId: 3 })),
    ).toThrow(ForbiddenException);
  });

  it('guards account deletion and every key management route', () => {
    const guardsOf = (target: object): unknown[] =>
      (Reflect.getMetadata(GUARDS_METADATA, target) as unknown[]) ?? [];

    // The handler as Nest stores it, read off the prototype by name.
    const remove = Object.getOwnPropertyDescriptor(
      UsersController.prototype,
      'remove',
    )?.value as object;
    expect(guardsOf(remove)).toContain(SessionTokenGuard);
    expect(guardsOf(ApiClientsController)).toContain(SessionTokenGuard);
  });
});
