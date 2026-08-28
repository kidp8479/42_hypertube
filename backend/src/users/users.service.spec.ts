import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon2 from 'argon2';

// Only the methods this spec file actually drives need a precise type -
// the rest of the fake repository stays untyped via `useValue` below.
interface RepositoryMock {
  create: jest.Mock;
  save: jest.Mock;
}

describe('UsersService', () => {
  let service: UsersService;
  let repository: RepositoryMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          // Hand the DI container a fake Repository<User> so UsersService can
          // be built without a real database connection.
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('hashes the password', async () => {
    // Echo the input back, like the real repository would - good enough to
    // inspect what create() passed in, without a real database.
    repository.create.mockImplementation((data: Partial<User>) => data);
    repository.save.mockImplementation((data: Partial<User>) => data);

    const dto: CreateUserDto = {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'plaintext123',
    };
    const user = await service.create(dto);

    // Not just "different from the plaintext" - a genuine, verifiable
    // argon2 hash of it, so a bug that mangles the password some other
    // way wouldn't slip past this test.
    expect(user.password).not.toBe(dto.password);
    expect(await argon2.verify(user.password, dto.password)).toBe(true);
  });
});
