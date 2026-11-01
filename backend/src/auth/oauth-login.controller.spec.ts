// Unit spec for OAuthLoginController with mocked services: both callbacks hand
// the SPA a single-use exchange code, never a token. The redirects to the
// providers are covered over HTTP by the Playwright OAuth spec.
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { OAuthLoginController } from './oauth-login.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { OAuthProfile } from './strategies/oauth-profile.interface';
import { OAuthProvider } from './entities/oauth-account.entity';

describe('OAuthLoginController', () => {
  const resolveOAuthUser = jest.fn();
  const issue = jest.fn();
  const login = jest.fn();
  let controller: OAuthLoginController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [OAuthLoginController],
      providers: [
        { provide: AuthService, useValue: { resolveOAuthUser, login } },
        { provide: OAuthExchangeService, useValue: { issue } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'http://localhost:5173' },
        },
      ],
    }).compile();
    controller = module.get(OAuthLoginController);
  });

  describe.each(['fortyTwoCallback', 'githubCallback'] as const)(
    '%s',
    (callback) => {
      const profile: OAuthProfile = {
        provider: OAuthProvider.FORTYTWO,
        providerUserId: '12345',
        email: 'ada@example.com',
        suggestedUsername: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      };

      it('redirects to the SPA with a single-use exchange code, never a token', async () => {
        resolveOAuthUser.mockResolvedValue({ id: 7 });
        issue.mockReturnValue('the-code');

        const result = await controller[callback]({
          user: profile,
        } as unknown as Request);

        expect(resolveOAuthUser).toHaveBeenCalledWith(profile);
        expect(issue).toHaveBeenCalledWith(7);
        expect(result).toEqual({
          url: 'http://localhost:5173/oauth/callback?code=the-code',
        });
        expect(login).not.toHaveBeenCalled();
      });
    },
  );
});
