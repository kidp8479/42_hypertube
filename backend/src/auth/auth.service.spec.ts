import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

// Only the methods a spec actually drives need a precise type; the rest of
// the fake stays loose.
type UsersServiceMock = {
  findByEmail: jest.Mock;
};

// A plausible User row. Override just the fields a given test cares about.
const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    email: 'ada@example.com',
    username: 'ada',
    firstName: 'Ada',
    lastName: 'Lovelace',
    password: 'set-me-in-the-test',
    profilePicture: 'https://example.com/avatar.png',
    preferredLanguage: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as User;

describe('AuthService', () => {
  // --- shared setup ---
  let service: AuthService;
  let users: UsersServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn() },
        },
      ],
    }).compile();

    // `.compile()` does not run lifecycle hooks; `onModuleInit` seeds the
    // dummy hash that the "unknown email" path relies on.
    await module.init();

    service = module.get<AuthService>(AuthService);
    users = module.get(UsersService);
  });

  // --- tests ---
  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('returns the user when the password matches', async () => {
      const password = 'correct horse battery staple';
      const user = buildUser({ password: await argon2.hash(password) });
      users.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser(user.email, password);

      expect(result).toBe(user);
      expect(users.findByEmail).toHaveBeenCalledWith(user.email);
    });

    it('returns null when the password is wrong', async () => {
      const user = buildUser({ password: await argon2.hash('the real one') });
      users.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser(user.email, 'a guess');

      expect(result).toBeNull();
    });

    it('returns null when the email is unknown', async () => {
      users.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nobody@example.com', 'x');

      expect(result).toBeNull();
    });
  });
});
