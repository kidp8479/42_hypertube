import { Controller, Get, INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { QueryFailedError } from 'typeorm';
import { QueryFailedFilter } from './query-failed.filter';

const uniqueViolation = () => {
  const err = new QueryFailedError(
    'INSERT ...',
    [],
    new Error('duplicate key'),
  );
  (err as QueryFailedError & { code: string }).code = '23505';
  return err;
};

@Controller()
class ProbeController {
  @Get('dup')
  dup() {
    throw uniqueViolation();
  }

  @Get('other')
  other() {
    throw new QueryFailedError('SELECT ...', [], new Error('syntax error'));
  }
}

describe('QueryFailedFilter', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(
      new QueryFailedFilter(app.get(HttpAdapterHost).httpAdapter),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('maps a unique violation to 409 with a generic message', async () => {
    const res = await request(app.getHttpServer()).get('/dup').expect(409);
    const body = res.body as { message?: string };

    expect(body.message).toBe('Resource already exists');
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });

  it('leaves any other query error as a 500', async () => {
    await request(app.getHttpServer()).get('/other').expect(500);
  });
});
