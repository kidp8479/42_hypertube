import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Drives the real HTTP pipeline so the ParseIntPipe on :id is exercised;
// the service is stubbed since these cases never reach it.
describe('UsersController :id validation', () => {
  let app: INestApplication<App>;
  const usersService = {
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
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
});
