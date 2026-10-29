// HTTP spec for PATCH /users/:id: the body the route accepts, validated by
// the app's own global pipe, and the sessions restarted after a credential
// change. Ownership (403) is in users.controller.spec.ts.
import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { globalValidationPipe } from '../common/pipes/global-validation.pipe';
import { PreferredLanguage } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Every request is user 7, so PATCH /users/7 is always one's own profile.
const stubAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    context.switchToHttp().getRequest<{ user?: { id: number } }>().user = {
      id: 7,
    };
    return true;
  },
};

describe('PATCH /users/:id body', () => {
  let app: INestApplication<App>;
  const usersService = { update: jest.fn() };
  const refreshTokens = { restartSessions: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: RefreshTokenService, useValue: refreshTokens },
        { provide: APP_GUARD, useValue: stubAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(globalValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('saves a supported preferred language', async () => {
    usersService.update.mockResolvedValue({
      user: { id: 7, preferredLanguage: PreferredLanguage.FR },
      credentialsChanged: false,
    });

    const res = await request(app.getHttpServer())
      .patch('/users/7')
      .send({ preferredLanguage: 'fr' })
      .expect(200);

    expect(usersService.update).toHaveBeenCalledWith(7, {
      preferredLanguage: PreferredLanguage.FR,
    });
    expect(res.body).toMatchObject({ preferredLanguage: 'fr' });
  });

  it('rejects a language the app does not support with 400', async () => {
    await request(app.getHttpServer())
      .patch('/users/7')
      .send({ preferredLanguage: 'de' })
      .expect(400);

    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('rejects a username containing @ with 400: the login field reads @ as an email', async () => {
    await request(app.getHttpServer())
      .patch('/users/7')
      .send({ username: 'ada@home' })
      .expect(400);

    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('after a credential change, ends every session and hands the caller a new cookie', async () => {
    usersService.update.mockResolvedValue({
      user: { id: 7 },
      credentialsChanged: true,
    });
    refreshTokens.restartSessions.mockResolvedValue({
      secret: 'r1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const body = {
      email: 'grace@example.com',
      password: 'brand new pass',
      currentPassword: 'current pass',
    };

    const res = await request(app.getHttpServer())
      .patch('/users/7')
      .send(body)
      .expect(200);

    expect(usersService.update).toHaveBeenCalledWith(7, body);
    expect(refreshTokens.restartSessions).toHaveBeenCalledWith(7);
    expect(res.headers['set-cookie']?.[0]).toMatch(
      /^refresh_token=r1;.*HttpOnly/,
    );
  });

  it('leaves the sessions alone for a profile-only change', async () => {
    usersService.update.mockResolvedValue({
      user: { id: 7 },
      credentialsChanged: false,
    });

    const res = await request(app.getHttpServer())
      .patch('/users/7')
      .send({ firstName: 'Grace' })
      .expect(200);

    expect(refreshTokens.restartSessions).not.toHaveBeenCalled();
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('revokes nothing when the change is refused', async () => {
    usersService.update.mockRejectedValue(new ForbiddenException());

    await request(app.getHttpServer())
      .patch('/users/7')
      .send({ password: 'brand new pass', currentPassword: 'wrong' })
      .expect(403);

    expect(refreshTokens.restartSessions).not.toHaveBeenCalled();
  });

  it.each(['http://example.com/a.png', 'javascript:alert(1)', 'not a url'])(
    'rejects the profile picture %s with 400: https URLs only',
    async (profilePicture) => {
      await request(app.getHttpServer())
        .patch('/users/7')
        .send({ profilePicture })
        .expect(400);

      expect(usersService.update).not.toHaveBeenCalled();
    },
  );

  it('accepts an https profile picture URL', async () => {
    usersService.update.mockResolvedValue({
      user: {},
      credentialsChanged: false,
    });

    await request(app.getHttpServer())
      .patch('/users/7')
      .send({ profilePicture: 'https://example.com/a.png' })
      .expect(200);
  });
});
