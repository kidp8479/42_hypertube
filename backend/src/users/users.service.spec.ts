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
            update: jest.fn(),
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
    });
  });
});
