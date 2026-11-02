// Unit spec for JwtStrategy: a verified payload becomes a minimal req.user,
// unless its account is gone, its credentials changed after it was issued, or
// the API key it was bought with has been revoked.
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { ApiClientsService } from '../../api-clients/api-clients.service';

describe('JwtStrategy', () => {
  const findCredentialsChangedAt = jest.fn();
  const keyExists = jest.fn();
  const strategy = new JwtStrategy(
    { getOrThrow: () => 'a'.repeat(32) } as unknown as ConfigService,
    { findCredentialsChangedAt } as unknown as UsersService,
    { exists: keyExists } as unknown as ApiClientsService,
  );
  // 2026-11-01T12:00:00Z, in the seconds a token's `iat` counts.
  const changedAt = new Date('2026-11-01T12:00:00.600Z');
  const changedAtSeconds = Math.floor(changedAt.getTime() / 1000);

  beforeEach(() => {
    findCredentialsChangedAt.mockReset();
    keyExists.mockReset();
  });

  it('maps a verified payload to a minimal req.user', async () => {
    findCredentialsChangedAt.mockResolvedValue({ credentialsChangedAt: null });

    await expect(strategy.validate({ sub: 7, iat: 1 })).resolves.toEqual({
      id: 7,
    });
    expect(findCredentialsChangedAt).toHaveBeenCalledWith(7);
    // A login token names no key: nothing more to read.
    expect(keyExists).not.toHaveBeenCalled();
  });

  it('keeps the API client a token was issued to, while its key exists', async () => {
    findCredentialsChangedAt.mockResolvedValue({ credentialsChangedAt: null });
    keyExists.mockResolvedValue(true);

    await expect(
      strategy.validate({ sub: 7, cid: 3, iat: 1 }),
    ).resolves.toEqual({ id: 7, apiClientId: 3 });
    expect(keyExists).toHaveBeenCalledWith(3, 7);
  });

  it('refuses a token bought with a key revoked since', async () => {
    findCredentialsChangedAt.mockResolvedValue({ credentialsChangedAt: null });
    keyExists.mockResolvedValue(false);

    await expect(strategy.validate({ sub: 7, cid: 3, iat: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token whose account no longer exists', async () => {
    findCredentialsChangedAt.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 7, iat: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a token issued before the credentials changed (an OAuth claim)', async () => {
    findCredentialsChangedAt.mockResolvedValue({
      credentialsChangedAt: changedAt,
    });

    await expect(
      strategy.validate({ sub: 7, iat: changedAtSeconds - 1 }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a token issued in the same second as the change, or after', async () => {
    // `iat` has no milliseconds: a token minted right after the claim may
    // carry the claim's second, and must not lock its new owner out.
    findCredentialsChangedAt.mockResolvedValue({
      credentialsChangedAt: changedAt,
    });

    await expect(
      strategy.validate({ sub: 7, iat: changedAtSeconds }),
    ).resolves.toEqual({ id: 7 });
    await expect(
      strategy.validate({ sub: 7, iat: changedAtSeconds + 60 }),
    ).resolves.toEqual({ id: 7 });
  });
});
