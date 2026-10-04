import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { OAuthProfile } from './strategies/oauth-profile.interface';
import { OAuthProvider } from './entities/oauth-account.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

// Only the AuthService methods the controller calls need a type here.
type AuthServiceMock = {
  validateUser: jest.Mock;
  login: jest.Mock;
  resolveOAuthUser: jest.Mock;
};

const buildUser = (overrides: Partial<User> = {}): User =>
  ({ id: 1, email: 'ada@example.com', username: 'ada', ...overrides }) as User;

const loginDto: LoginDto = {
  email: 'ada@example.com',
  password: 'correct horse battery staple',
};

describe('AuthController', () => {
  let controller: AuthController;
  let auth: AuthServiceMock;
  let exchange: { issue: jest.Mock };

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
          },
        },
        { provide: OAuthExchangeService, useValue: { issue: jest.fn() } },
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
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('returns the access token when credentials are valid', async () => {
      const user = buildUser();
      auth.validateUser.mockResolvedValue(user);
      auth.login.mockResolvedValue({ access_token: 'signed.jwt.token' });

      const result = await controller.login(loginDto);

      expect(result).toEqual({ access_token: 'signed.jwt.token' });
      expect(auth.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(auth.login).toHaveBeenCalledWith(user);
    });

    it('throws 401 and never mints a token when credentials are rejected', async () => {
      auth.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(auth.login).not.toHaveBeenCalled();
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
});
