// HTTP spec for PATCH /users/:id: the body the route accepts, validated by
// the app's own global pipe. Ownership (403) is in users.controller.spec.ts.
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
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
      id: 7,
      preferredLanguage: PreferredLanguage.FR,
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
});
