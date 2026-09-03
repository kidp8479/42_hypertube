import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthUser } from '../auth/current-user.decorator';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

type UsersServiceMock = {
  findOne: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
};

describe('UsersController', () => {
  let controller: UsersController;
  let users: UsersServiceMock;

  const ada: AuthUser = { id: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          // The controller only needs a UsersService-shaped object; mock it
          // directly instead of pulling in the service and its repository.
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    users = module.get(UsersService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ownership on :id', () => {
    it('update rejects a mismatched user with 403 and never calls the service', () => {
      expect(() => controller.update(2, { firstName: 'x' }, ada)).toThrow(
        ForbiddenException,
      );
      expect(users.update).not.toHaveBeenCalled();
    });

    it('update proceeds when the id is the caller', () => {
      void controller.update(1, { firstName: 'Ada K.' }, ada);

      expect(users.update).toHaveBeenCalledWith(1, { firstName: 'Ada K.' });
    });

    it('remove rejects a mismatched user with 403', () => {
      expect(() => controller.remove(2, ada)).toThrow(ForbiddenException);
      expect(users.remove).not.toHaveBeenCalled();
    });

    it('remove proceeds when the id is the caller', () => {
      void controller.remove(1, ada);

      expect(users.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('findMe', () => {
    it('looks the caller up by their own id and returns that profile', async () => {
      const profile = { id: 1, email: 'ada@example.com' };
      users.findOne.mockResolvedValue(profile);

      const result = await controller.findMe(ada);

      expect(users.findOne).toHaveBeenCalledWith(1);
      expect(result).toBe(profile);
    });
  });
});
