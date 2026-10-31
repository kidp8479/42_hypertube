// HTTP spec for the picture routes: a multipart registration, the owner-only
// upload and removal, the size cap, and how a stored picture is served.
import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import request from 'supertest';
import { App } from 'supertest/types';
import { globalValidationPipe } from '../common/pipes/global-validation.pipe';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import { ProfilePictureController } from './profile-picture.controller';
import {
  PICTURE_MAX_BYTES,
  ProfilePictureStore,
} from './profile-picture.store';
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

const PICTURE = Buffer.from('picture bytes');

describe('profile picture routes', () => {
  let app: INestApplication<App>;
  const usersService = {
    create: jest.fn(),
    setPicture: jest.fn(),
    clearPicture: jest.fn(),
  };
  const pictures = { open: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController, ProfilePictureController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: ProfilePictureStore, useValue: pictures },
        { provide: RefreshTokenService, useValue: {} },
        { provide: APP_GUARD, useValue: stubAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(globalValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /users as multipart', () => {
    const register = () =>
      request(app.getHttpServer())
        .post('/users')
        .field('email', 'ada@example.com')
        .field('username', 'ada')
        .field('firstName', 'Ada')
        .field('lastName', 'Lovelace')
        .field('password', 'plaintext123');

    it('hands the picture bytes to the service with the fields', async () => {
      usersService.create.mockResolvedValue({ id: 1 });

      await register().attach('picture', PICTURE, 'me.png').expect(201);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'ada' }),
        PICTURE,
      );
    });

    it('registers without a file too', async () => {
      usersService.create.mockResolvedValue({ id: 1 });

      await register().expect(201);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'ada' }),
        undefined,
      );
    });

    it('answers 413 over the size cap, before the service runs', async () => {
      await register()
        .attach('picture', Buffer.alloc(PICTURE_MAX_BYTES + 1), 'big.png')
        .expect(413);

      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('PUT /users/:id/picture', () => {
    it("replaces the caller's own picture", async () => {
      usersService.setPicture.mockResolvedValue({ id: 7 });

      await request(app.getHttpServer())
        .put('/users/7/picture')
        .attach('picture', PICTURE, 'me.png')
        .expect(200);

      expect(usersService.setPicture).toHaveBeenCalledWith(7, PICTURE);
    });

    it("answers 403 on another user's picture", async () => {
      await request(app.getHttpServer())
        .put('/users/8/picture')
        .attach('picture', PICTURE, 'me.png')
        .expect(403);

      expect(usersService.setPicture).not.toHaveBeenCalled();
    });

    it('answers 400 without a file', async () => {
      await request(app.getHttpServer()).put('/users/7/picture').expect(400);

      expect(usersService.setPicture).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /users/:id/picture', () => {
    it("clears the caller's own picture", async () => {
      usersService.clearPicture.mockResolvedValue({ id: 7 });

      await request(app.getHttpServer()).delete('/users/7/picture').expect(200);

      expect(usersService.clearPicture).toHaveBeenCalledWith(7);
    });

    it("answers 403 on another user's picture", async () => {
      await request(app.getHttpServer()).delete('/users/8/picture').expect(403);

      expect(usersService.clearPicture).not.toHaveBeenCalled();
    });
  });

  describe('GET /pictures/:name', () => {
    it('streams the picture with its type, cached for good', async () => {
      pictures.open.mockResolvedValue({
        stream: Readable.from([PICTURE]),
        mime: 'image/png',
        size: PICTURE.length,
      });

      const res = await request(app.getHttpServer())
        .get('/pictures/a.png')
        .expect(200);

      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['cache-control']).toBe(
        'public, max-age=31536000, immutable',
      );
      expect(res.body).toEqual(PICTURE);
    });

    it('answers 404 for a name the store does not know', async () => {
      pictures.open.mockRejectedValue(new NotFoundException());

      await request(app.getHttpServer()).get('/pictures/nope.png').expect(404);
    });
  });
});
