import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

// Only the methods a spec actually drives need a precise type; the rest of
// the fake repository stays loose.
type RepositoryMock = {
  create: jest.Mock;
  save: jest.Mock;
  findOneBy: jest.Mock;
  preload: jest.Mock;
  delete: jest.Mock;
};

// A valid registration payload. Override just the fields a test cares about.
const buildCreateUserDto = (
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto => ({
  email: 'ada@example.com',
  username: 'ada',
  firstName: 'Ada',
  lastName: 'Lovelace',
  password: 'plaintext123',
  ...overrides,
});

describe('UsersService', () => {
  // --- shared setup ---
  let service: UsersService;
  let repository: RepositoryMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          // Hand the DI container a fake Repository<User> so UsersService
          // can be built without a real database connection.
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            preload: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<RepositoryMock>(getRepositoryToken(User));
  });

  // --- tests ---
  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashes the password before it reaches the repository', async () => {
      // Echo the input back, like the real repository would - enough to
      // inspect what create() passed in, without a real database.
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);
      const dto = buildCreateUserDto();

      const user = await service.create(dto);

      // Not just "different from the plaintext" - a genuine, verifiable
      // argon2 hash of it, so a bug that mangles the password some other
      // way wouldn't slip past this test.
      expect(user.password).not.toBe(dto.password);
      expect(await argon2.verify(user.password, dto.password)).toBe(true);
      // The encoded hash carries its parameters; assert argon2id with the
      // pinned OWASP cost (ARGON2_OPTIONS), not the library defaults.
      expect(user.password).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    });

    it('does not set a profile picture (left null until the upload flow)', async () => {
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      const user = await service.create(buildCreateUserDto());

      expect(user.profilePicture).toBeUndefined();
    });
  });

  describe('update', () => {
    it('preloads the merged row and saves it (so entity hooks run)', async () => {
      const merged = { id: 1, firstName: 'Grace' } as User;
      repository.preload.mockResolvedValue(merged);
      repository.save.mockResolvedValue(merged);

      const result = await service.update(1, { firstName: 'Grace' });

      expect(repository.preload).toHaveBeenCalledWith({
        id: 1,
        firstName: 'Grace',
      });
      expect(repository.save).toHaveBeenCalledWith(merged);
      expect(result).toBe(merged);
    });
  });

  describe('lookups on a missing id', () => {
    it('findOne throws 404', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('update throws 404 and never saves', async () => {
      repository.preload.mockResolvedValue(undefined);

      await expect(service.update(999, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('remove throws 404', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
