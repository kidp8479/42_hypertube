// HTTP spec for what the users routes put on the wire (subject III.4): the
// list gives id and username, another user's profile gives id, username and
// picture, and only the owner's own profile carries the email.
import {
  ClassSerializerInterceptor,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PreferredLanguage, User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PublicUserDto } from './dto/public-user.dto';
import { RefreshTokenService } from '../sessions/refresh-token.service';

// Every request in this suite comes from user 7.
const stubAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    context.switchToHttp().getRequest<{ user?: { id: number } }>().user = {
      id: 7,
    };
    return true;
  },
};

// A full row, as the repository returns it: every column is set, so the
// exact-keys assertions fail if any private one reaches the response.
const buildUser = (overrides: Partial<User> = {}): User =>
  Object.assign(new User(), {
    id: 7,
    email: 'user7@example.com',
    username: 'user7',
    firstName: 'Ada',
    lastName: 'Lovelace',
    password: '$argon2id$v=19$m=19456,t=2,p=1$hash',
    profilePicture: 'https://example.com/7.png',
    preferredLanguage: PreferredLanguage.FR,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    ...overrides,
  });

describe('UsersController response fields', () => {
  let app: INestApplication<App>;
  const usersService = {
    findAll: jest.fn(),
    findOneForViewer: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: RefreshTokenService, useValue: {} },
        { provide: APP_GUARD, useValue: stubAuthGuard },
        // The serializer main.ts installs globally: what it emits is what a
        // client receives.
        {
          provide: APP_INTERCEPTOR,
          useFactory: (reflector: Reflector) =>
            new ClassSerializerInterceptor(reflector),
          inject: [Reflector],
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('findAll', () => {
    it('lists users with their id and username only', async () => {
      usersService.findAll.mockResolvedValue([
        buildUser(),
        buildUser({ id: 42, username: 'user42' }),
      ]);

      const res = await request(app.getHttpServer()).get('/users').expect(200);

      const body = res.body as Record<string, unknown>[];
      expect(body).toHaveLength(2);
      body.forEach((item) =>
        expect(Object.keys(item).sort()).toEqual(['id', 'username']),
      );
    });
  });

  describe('findOne', () => {
    it("gives another user's id, username and picture, never the email", async () => {
      usersService.findOneForViewer.mockResolvedValue(
        new PublicUserDto(buildUser({ id: 42 })),
      );

      const res = await request(app.getHttpServer())
        .get('/users/42')
        .expect(200);

      expect(Object.keys(res.body as object).sort()).toEqual([
        'id',
        'profilePicture',
        'username',
      ]);
    });

    it('gives the owner their own profile, email included', async () => {
      usersService.findOneForViewer.mockResolvedValue(buildUser());

      const res = await request(app.getHttpServer())
        .get('/users/7')
        .expect(200);

      expect(res.body).toMatchObject({ id: 7, email: 'user7@example.com' });
      expect(res.body).not.toHaveProperty('password');
    });
  });
});
