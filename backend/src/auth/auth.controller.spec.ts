// Unit spec for AuthController with mocked services: a rejected login, the two
// OAuth callbacks and the code exchange. The session routes (login, refresh,
// logout) and the cookie on the wire are covered over HTTP by
// auth.session.spec.ts.
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RefreshTokenService } from './refresh-token.service';
import { REFRESH_COOKIE } from './refresh-cookie.util';
import { OAuthProfile } from './strategies/oauth-profile.interface';
import { OAuthProvider } from './entities/oauth-account.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

// Only the AuthService methods the controller calls need a type here.
type AuthServiceMock = {
  validateUser: jest.Mock;
  login: jest.Mock;
  resolveOAuthUser: jest.Mock;
  loginById: jest.Mock;
};

const buildUser = (overrides: Partial<User> = {}): User =>
  ({ id: 1, email: 'ada@example.com', username: 'ada', ...overrides }) as User;

const EXPIRES = new Date('2026-10-30T12:00:00.000Z');

// The controller only touches req.headers and res.cookie(): a hand-built
// request and response are enough.
const buildHttp = () => {
  const cookie = jest.fn();
  const req = { headers: {} } as unknown as Request;
  const res = { cookie } as unknown as Response;
  return { req, res, cookie };
};

const loginDto: LoginDto = {
  identifier: 'ada',
  password: 'correct horse battery staple',
};

describe('AuthController', () => {
  let controller: AuthController;
  let auth: AuthServiceMock;
  let exchange: { issue: jest.Mock; redeem: jest.Mock };
  let refresh: {
    issue: jest.Mock;
    rotate: jest.Mock;
    revokeFamilyOf: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            resolveOAuthUser: jest.fn(),
            loginById: jest.fn(),
          },
        },
        {
          provide: OAuthExchangeService,
          useValue: { issue: jest.fn(), redeem: jest.fn() },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            issue: jest.fn(),
            rotate: jest.fn(),
            revokeFamilyOf: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('http://localhost:5173'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    auth = module.get(AuthService);
    exchange = module.get(OAuthExchangeService);
    refresh = module.get(RefreshTokenService);
  });

  describe('login', () => {
    it('throws 401 and never mints a token or a session when credentials are rejected', async () => {
      auth.validateUser.mockResolvedValue(null);
      const { req, res, cookie } = buildHttp();

      await expect(controller.login(loginDto, req, res)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(auth.login).not.toHaveBeenCalled();
      expect(refresh.issue).not.toHaveBeenCalled();
      expect(cookie).not.toHaveBeenCalled();
    });
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
        auth.resolveOAuthUser.mockResolvedValue(buildUser({ id: 7 }));
        exchange.issue.mockReturnValue('the-code');

        const result = await controller[callback]({
          user: profile,
        } as unknown as Request);

        expect(auth.resolveOAuthUser).toHaveBeenCalledWith(profile);
        expect(exchange.issue).toHaveBeenCalledWith(7);
        expect(result).toEqual({
          url: 'http://localhost:5173/oauth/callback?code=the-code',
        });
        expect(auth.login).not.toHaveBeenCalled();
      });
    },
  );

  describe('exchange', () => {
    it('trades a valid code for an access token and a refresh cookie', async () => {
      exchange.redeem.mockReturnValue(7);
      auth.loginById.mockResolvedValue({ access_token: 'signed.jwt.token' });
      refresh.issue.mockResolvedValue({ secret: 'r1', expiresAt: EXPIRES });
      const { req, res, cookie } = buildHttp();

      const result = await controller.exchange({ code: 'the-code' }, req, res);

      expect(exchange.redeem).toHaveBeenCalledWith('the-code');
      expect(auth.loginById).toHaveBeenCalledWith(7);
      expect(refresh.issue).toHaveBeenCalledWith(7);
      expect(cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'r1',
        expect.any(Object),
      );
      expect(result).toEqual({ access_token: 'signed.jwt.token' });
    });

    it('throws 401 and never mints a token for an unknown, used or expired code', async () => {
      exchange.redeem.mockReturnValue(undefined);

      const { req, res } = buildHttp();

      await expect(
        controller.exchange({ code: 'bad-code' }, req, res),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(auth.loginById).not.toHaveBeenCalled();
      expect(refresh.issue).not.toHaveBeenCalled();
    });
  });
});
