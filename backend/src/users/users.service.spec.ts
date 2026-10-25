// Unit spec for UsersService with a mocked repository: password hashing,
// OAuth account creation (username fallback, column limits), update (with
// re-authentication for a credential change) and 404s.
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { FindOperator } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

// Only the methods a spec actually drives need a precise type; the rest of
// the fake repository stays loose.
type RepositoryMock = {
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  findOneBy: jest.Mock;
  delete: jest.Mock;
  update: jest.Mock;
  createQueryBuilder: jest.Mock;
};

// The username each `findOneBy` call looked for, in order. The lookup is a
// raw operator (a case-insensitive comparison), so the name sits in its
// parameters rather than in the `where` object itself.
function lookedUpUsernames(findOneBy: jest.Mock): unknown[] {
  const calls = findOneBy.mock.calls as [{ username: FindOperator<string> }][];
  return calls.map(
    ([where]) => where.username.objectLiteralParameters?.username as unknown,
  );
}

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
            delete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<RepositoryMock>(getRepositoryToken(User));
  });

  // --- tests ---
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
      expect(await argon2.verify(user.password!, dto.password)).toBe(true);
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

  describe('findForLogin', () => {
    it('looks an identifier with @ up as a normalized email', async () => {
      const user = { id: 1 } as User;
      const query = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      repository.createQueryBuilder.mockReturnValue(query);

      await expect(service.findForLogin(' Ada@Example.com ')).resolves.toBe(
        user,
      );
      // LoginDto only trims: this is where a login email gets lower-cased.
      expect(query.where).toHaveBeenCalledWith('user.email = :email', {
        email: 'ada@example.com',
      });
    });

    it('looks any other identifier up as a username, whatever the case, password included', async () => {
      const user = { id: 1 } as User;
      const query = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      repository.createQueryBuilder.mockReturnValue(query);

      await expect(service.findForLogin('ADA')).resolves.toBe(user);
      // Compared like the LOWER(username) unique index, and with the hash
      // that `select: false` would otherwise leave out.
      expect(query.where).toHaveBeenCalledWith(
        'LOWER(user.username) = LOWER(:identifier)',
        { identifier: 'ADA' },
      );
      expect(query.addSelect).toHaveBeenCalledWith('user.password');
    });
  });

  describe('findAll', () => {
    it('reads only the id and the username of each user', async () => {
      repository.find.mockResolvedValue([]);

      await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        select: { id: true, username: true },
      });
    });
  });

  describe('createFromOAuth', () => {
    const oauthProfile = {
      email: 'ada@example.com',
      suggestedUsername: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    it('creates a password-less user with the suggested username when free', async () => {
      repository.findOneBy.mockResolvedValue(null);
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      const user = await service.createFromOAuth(oauthProfile);

      expect(lookedUpUsernames(repository.findOneBy)).toEqual(['ada']);
      expect(user).toMatchObject({
        email: 'ada@example.com',
        username: 'ada',
        password: null,
        profilePicture: null,
      });
    });

    it('falls back to a numeric suffix when the suggested username is taken', async () => {
      repository.findOneBy
        .mockResolvedValueOnce({ id: 1, username: 'ada' })
        .mockResolvedValueOnce(null);
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      const user = await service.createFromOAuth(oauthProfile);

      expect(lookedUpUsernames(repository.findOneBy)).toEqual(['ada', 'ada1']);
      expect(user.username).toBe('ada1');
    });

    it('treats a username differing only by case as taken', async () => {
      repository.findOneBy.mockResolvedValue(null);
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      await service.createFromOAuth(oauthProfile);

      // The unique index is on LOWER(username): the lookup must compare the
      // same way, or it calls `Ada` free for `ada` and the insert then fails.
      const [[where]] = repository.findOneBy.mock.calls as [
        [{ username: FindOperator<string> }],
      ];
      expect(where.username.getSql?.('"user"."username"')).toBe(
        'LOWER("user"."username") = LOWER(:username)',
      );
    });

    it('falls back to a random suffix once the numeric attempts are exhausted', async () => {
      // Every candidate - 'ada', 'ada1', 'ada2', ... - looks taken, so the
      // search runs past MAX_USERNAME_ATTEMPTS and has to bail out.
      repository.findOneBy.mockResolvedValue({ id: 1 });
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      const user = await service.createFromOAuth(oauthProfile);

      expect(repository.findOneBy.mock.calls.length).toBeGreaterThan(50);
      expect(user.username).toMatch(/^ada[0-9a-f]{8}$/);
    });

    describe('column length limits', () => {
      // A GitHub login can reach 39 characters; the username column is 30.
      const longLogin = 'a'.repeat(39);

      beforeEach(() => {
        repository.create.mockImplementation((data: Partial<User>) => data);
        repository.save.mockImplementation((data: Partial<User>) => data);
      });

      it('truncates a suggested username to the column length', async () => {
        repository.findOneBy.mockResolvedValue(null);

        const user = await service.createFromOAuth({
          ...oauthProfile,
          suggestedUsername: longLogin,
        });

        expect(user.username).toBe('a'.repeat(30));
      });

      it('keeps a numeric suffix within the column length on collision', async () => {
        repository.findOneBy
          .mockResolvedValueOnce({ id: 1 })
          .mockResolvedValueOnce(null);

        const user = await service.createFromOAuth({
          ...oauthProfile,
          suggestedUsername: longLogin,
        });

        expect(user.username).toBe(`${'a'.repeat(29)}1`);
      });

      it('keeps the random fallback suffix within the column length', async () => {
        repository.findOneBy.mockResolvedValue({ id: 1 });

        const user = await service.createFromOAuth({
          ...oauthProfile,
          suggestedUsername: longLogin,
        });

        expect(user.username).toMatch(/^a{22}[0-9a-f]{8}$/);
      });

      it('truncates first and last name to the column length', async () => {
        repository.findOneBy.mockResolvedValue(null);

        const user = await service.createFromOAuth({
          ...oauthProfile,
          firstName: 'F'.repeat(255),
          lastName: 'L'.repeat(255),
        });

        expect(user.firstName).toBe('F'.repeat(100));
        expect(user.lastName).toBe('L'.repeat(100));
      });
    });
  });

  describe('claimEmail', () => {
    it('drops the password and marks the email verified, for that user only', async () => {
      await service.claimEmail(7);

      expect(repository.update).toHaveBeenCalledWith(7, {
        password: null,
        emailVerified: true,
      });
    });
  });

  describe('update', () => {
    let stored: User;

    /** The row `update` loads, password hash included, and saves back as is. */
    function storeUser(password: string | null) {
      stored = {
        id: 1,
        email: 'ada@example.com',
        firstName: 'Ada',
        password,
        emailVerified: true,
      } as User;
      repository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(stored),
      });
      repository.save.mockImplementation((user: User) => Promise.resolve(user));
    }

    beforeEach(async () => {
      storeUser(await argon2.hash('current pass'));
    });

    it('saves a profile field without asking for the password', async () => {
      const result = await service.update(1, { firstName: 'Grace' });

      expect(result).toEqual({
        user: expect.objectContaining({ firstName: 'Grace' }) as User,
        credentialsChanged: false,
      });
    });

    it('hashes a new password and reports a credential change', async () => {
      const result = await service.update(1, {
        password: 'brand new pass',
        currentPassword: 'current pass',
      });

      expect(result.credentialsChanged).toBe(true);
      expect(stored.password).toMatch(/^\$argon2id\$/);
      await expect(
        argon2.verify(stored.password as string, 'brand new pass'),
      ).resolves.toBe(true);
      expect(stored).not.toHaveProperty('currentPassword');
    });

    it('marks a new email unverified', async () => {
      const result = await service.update(1, {
        email: 'grace@example.com',
        currentPassword: 'current pass',
      });

      expect(result.credentialsChanged).toBe(true);
      expect(stored.emailVerified).toBe(false);
    });

    it('treats the current email sent back as no change', async () => {
      const result = await service.update(1, { email: 'ada@example.com' });

      expect(result.credentialsChanged).toBe(false);
      expect(stored.emailVerified).toBe(true);
    });

    it('answers 400 when currentPassword is missing for a credential change', async () => {
      await expect(
        service.update(1, { password: 'brand new pass' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('answers 403 on a wrong currentPassword, saving nothing', async () => {
      await expect(
        service.update(1, { email: 'grace@example.com', currentPassword: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it.each([
      ['a password', { password: 'brand new pass' }],
      ['an email', { email: 'grace@example.com' }],
    ])(
      'refuses %s change on an account without a password, saving nothing',
      async (_, dto) => {
        // OAuth-only, or just claimed: an access token still alive must not
        // be able to set credentials on it.
        storeUser(null);

        await expect(
          service.update(1, { ...dto, currentPassword: 'anything' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.save).not.toHaveBeenCalled();
      },
    );
  });

  describe('lookups on a missing id', () => {
    it('findOne throws 404', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('update throws 404 and never saves', async () => {
      repository.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

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
