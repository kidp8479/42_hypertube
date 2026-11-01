// Unit spec for AccountClaimService: a claim leaves no credential to
// whoever held the account before.
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountClaimService } from './account-claim.service';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import { ApiClientsService } from '../api-clients/api-clients.service';
import { OAuthAccount } from './entities/oauth-account.entity';

describe('AccountClaimService', () => {
  const claimEmail = jest.fn();
  const revokeSessions = jest.fn();
  const revokeKeys = jest.fn();
  const deleteLinks = jest.fn();
  let service: AccountClaimService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccountClaimService,
        { provide: UsersService, useValue: { claimEmail } },
        {
          provide: RefreshTokenService,
          useValue: { revokeAllForUser: revokeSessions },
        },
        {
          provide: ApiClientsService,
          useValue: { revokeAllForUser: revokeKeys },
        },
        {
          provide: getRepositoryToken(OAuthAccount),
          useValue: { delete: deleteLinks },
        },
      ],
    }).compile();
    service = module.get(AccountClaimService);
  });

  it('drops the password, then revokes the sessions, the API keys and the provider links', async () => {
    await service.claim(9);

    expect(claimEmail).toHaveBeenCalledWith(9);
    expect(revokeSessions).toHaveBeenCalledWith(9);
    expect(revokeKeys).toHaveBeenCalledWith(9);
    expect(deleteLinks).toHaveBeenCalledWith({ userId: 9 });
  });

  it('stops at the first failure, so the caller does not link the identity', async () => {
    revokeSessions.mockRejectedValueOnce(new Error('connection lost'));

    await expect(service.claim(9)).rejects.toThrow('connection lost');

    expect(revokeKeys).not.toHaveBeenCalled();
  });
});
