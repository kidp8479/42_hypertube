// Unit spec for AuthController with mocked services: login, the two OAuth
// callbacks, the code exchange, refresh and logout. HTTP-level behaviour
// (guards, status codes, the cookie on the wire) is covered by the
// neighbouring *.spec.ts files that boot the app.
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

// The controller only touches the cookie header, req.headers and res.cookie()
// / clearCookie(): a hand-built request and response are enough.
const buildHttp = (refreshSecret?: string) => {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const req = {
    headers: {
      cookie: refreshSecret ? `${REFRESH_COOKIE}=${refreshSecret}` : undefined,
    },
  } as unknown as Request;
  const res = { cookie, clearCookie } as unknown as Response;
  return { req, res, cookie, clearCookie };
};

const loginDto: LoginDto = {
  email: 'ada@example.com',
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

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('returns the access token and starts a session with a refresh cookie when credentials are valid', async () => {
      const user = buildUser();
      auth.validateUser.mockResolvedValue(user);
      auth.login.mockResolvedValue({ access_token: 'signed.jwt.token' });
      refresh.issue.mockResolvedValue({ secret: 'r1', expiresAt: EXPIRES });
      const { req, res, cookie } = buildHttp();

      const result = await controller.login(loginDto, req, res);

      expect(result).toEqual({ access_token: 'signed.jwt.token' });
      expect(auth.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(auth.login).toHaveBeenCalledWith(user);
      expect(refresh.issue).toHaveBeenCalledWith(user.id);
      expect(cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'r1',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
    });

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
        emailVerified: true,
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

  describe('refresh', () => {
    it('rotates the cookie token, sets the next one and returns a new access token', async () => {
      refresh.rotate.mockResolvedValue({
        userId: 7,
        secret: 'r2',
        expiresAt: EXPIRES,
      });
      auth.loginById.mockResolvedValue({ access_token: 'new.jwt.token' });
      const { req, res, cookie } = buildHttp('r1');

      const result = await controller.refresh(req, res);

      expect(refresh.rotate).toHaveBeenCalledWith('r1');
      expect(cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'r2',
        expect.any(Object),
      );
      expect(auth.loginById).toHaveBeenCalledWith(7);
      expect(result).toEqual({ access_token: 'new.jwt.token' });
    });

    it('answers 401 without touching the service when there is no cookie', async () => {
      const { req, res } = buildHttp();

      await expect(controller.refresh(req, res)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(refresh.rotate).not.toHaveBeenCalled();
    });

    it('answers 401 and clears the dead cookie when the token is rejected', async () => {
      refresh.rotate.mockRejectedValue(new UnauthorizedException());
      const { req, res, clearCookie } = buildHttp('stale');

      await expect(controller.refresh(req, res)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, {
        path: '/auth',
      });
    });
  });

  describe('logout', () => {
    it('revokes the session of the cookie token and clears the cookie', async () => {
      const { req, res, clearCookie } = buildHttp('r1');

      await controller.logout(req, res);

      expect(refresh.revokeFamilyOf).toHaveBeenCalledWith('r1');
      expect(clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, {
        path: '/auth',
      });
    });

    it('still succeeds, and clears the cookie, when there is nothing to revoke', async () => {
      const { req, res, clearCookie } = buildHttp();

      await expect(controller.logout(req, res)).resolves.toBeUndefined();

      expect(refresh.revokeFamilyOf).not.toHaveBeenCalled();
      expect(clearCookie).toHaveBeenCalled();
    });
  });
});
