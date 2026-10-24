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
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Every request in this suite comes from user 7.
const stubAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    context.switchToHttp().getRequest<{ user?: { id: number } }>().user = {
      id: 7,
    };
    return true;
  },
};

// A full row, as the repository returns it: every private field is set, so
// a test fails if any of them reaches the response.
function fullUser(id: number): User {
  return Object.assign(new User(), {
    id,
    email: `user${id}@example.com`,
    username: `user${id}`,
    firstName: 'Ada',
    lastName: 'Lovelace',
    password: '$argon2id$v=19$m=19456,t=2,p=1$hash',
    profilePicture: `https://example.com/${id}.png`,
  });
}

describe('UsersController response fields', () => {
  let app: INestApplication<App>;
  const usersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
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
    jest.clearAllMocks();
    await app.close();
  });

  it('lists users with their id and username only', async () => {
    usersService.findAll.mockResolvedValue([fullUser(7), fullUser(42)]);

    const res = await request(app.getHttpServer()).get('/users').expect(200);

    const body = res.body as Record<string, unknown>[];
    expect(body).toHaveLength(2);
    body.forEach((item) =>
      expect(Object.keys(item).sort()).toEqual(['id', 'username']),
    );
  });

  it("gives another user's id, username and picture, never the email", async () => {
    usersService.findOne.mockResolvedValue(fullUser(42));

    const res = await request(app.getHttpServer()).get('/users/42').expect(200);

    expect(Object.keys(res.body as object).sort()).toEqual([
      'id',
      'profilePicture',
      'username',
    ]);
  });

  it('gives the owner their own profile, email included', async () => {
    usersService.findOne.mockResolvedValue(fullUser(7));

    const res = await request(app.getHttpServer()).get('/users/7').expect(200);

    expect(res.body).toMatchObject({ id: 7, email: 'user7@example.com' });
    expect(res.body).not.toHaveProperty('password');
  });
});
