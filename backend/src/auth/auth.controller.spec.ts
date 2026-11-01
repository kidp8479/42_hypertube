// Unit spec for AuthController with mocked services: a rejected login and the
// code exchange. The session routes (login, refresh,
// logout) and the cookie on the wire are covered over HTTP by
// auth.session.spec.ts.
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import { LoginIdentifierThrottlerGuard } from './guards/login-identifier-throttler.guard';
import { REFRESH_COOKIE } from '../sessions/refresh-cookie.util';
import { LoginDto } from './dto/login.dto';

// Only the AuthService methods the controller calls need a type here.
type AuthServiceMock = {
  validateUser: jest.Mock;
  login: jest.Mock;
  loginById: jest.Mock;
};

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
  let exchange: { redeem: jest.Mock };
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
            loginById: jest.fn(),
          },
        },
        {
          provide: OAuthExchangeService,
          useValue: { redeem: jest.fn() },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            issue: jest.fn(),
            rotate: jest.fn(),
            revokeFamilyOf: jest.fn(),
          },
        },
      ],
    })
      // Throttling is covered over HTTP in auth.throttle.spec.ts.
      .overrideGuard(LoginIdentifierThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
