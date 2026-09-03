import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Stands in for the real JwtAuthGuard: every request in this suite is
// treated as authenticated as user 7, so a handler that reads req.user
// (findMe) runs without wiring up JWT.
const stubAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    context.switchToHttp().getRequest<{ user?: { id: number } }>().user = {
      id: 7,
    };
    return true;
  },
};

// Drives the real HTTP pipeline so route matching and the ParseIntPipe on
// :id are exercised; the service is stubbed since these cases barely reach it.
describe('UsersController path routing', () => {
  let app: INestApplication<App>;
  const usersService = {
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: APP_GUARD, useValue: stubAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('rejects a non-numeric id with 400 and never calls the service', async () => {
    await request(app.getHttpServer()).get('/users/abc').expect(400);
    expect(usersService.findOne).not.toHaveBeenCalled();
  });

  it('passes a numeric id through as a number', async () => {
    usersService.findOne.mockResolvedValue({ id: 42 });

    await request(app.getHttpServer()).get('/users/42').expect(200);

    expect(usersService.findOne).toHaveBeenCalledWith(42);
  });

  it('routes GET /users/me to findMe, not the :id route', async () => {
    usersService.findOne.mockResolvedValue({ id: 7 });

    await request(app.getHttpServer()).get('/users/me').expect(200);

    // Called with the guard-supplied user id, so "me" was never handed to
    // ParseIntPipe as a would-be :id (that would 400).
    expect(usersService.findOne).toHaveBeenCalledWith(7);
  });
});
