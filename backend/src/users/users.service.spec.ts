// Unit spec for UsersService with a mocked repository: password hashing,
// OAuth account creation (column limits), update (with
// re-authentication for a credential change), the password strength check
// and its place in each flow, the picture's file kept in step with its
// column, and 404s.
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { UsernameAllocator } from './username-allocator.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { ProfilePictureStore } from './profile-picture.store';
import { PasswordStrengthService } from './password-strength.service';

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
  const usernames = { available: jest.fn().mockResolvedValue('ada') };
  // Stores nothing: hands `persist` a fixed name, as the real store would a
  // fresh one.
  const pictures = {
    storeFor: jest.fn(
      (_bytes: Buffer, persist: (name: string) => Promise<unknown>) =>
        persist('new.png'),
    ),
    delete: jest.fn(),
  };
  // Accepts every password unless a test says otherwise; the rule itself is
  // covered by password-strength.service.spec.ts.
  const passwordStrength = { assertStrong: jest.fn() };
  const weak = () => {
    throw new UnprocessableEntityException();
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsernameAllocator, useValue: usernames },
        { provide: ProfilePictureStore, useValue: pictures },
        { provide: PasswordStrengthService, useValue: passwordStrength },
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

    it('refuses a weak password before hashing or storing anything', async () => {
      passwordStrength.assertStrong.mockImplementationOnce(weak);
      const dto = buildCreateUserDto();

      await expect(
        service.create(dto, Buffer.from('png')),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(passwordStrength.assertStrong).toHaveBeenCalledWith(
        dto.password,
        dto,
      );
      expect(pictures.storeFor).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('registers without a picture as null: the default avatar', async () => {
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      const user = await service.create(buildCreateUserDto());

      expect(user.profilePicture).toBeNull();
      expect(pictures.storeFor).not.toHaveBeenCalled();
    });

    it('stores a picture and saves the user with its name', async () => {
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);
      const bytes = Buffer.from('png bytes');

      const user = await service.create(buildCreateUserDto(), bytes);

      expect(pictures.storeFor).toHaveBeenCalledWith(
        bytes,
        expect.any(Function),
      );
      expect(user.profilePicture).toBe('new.png');
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

    it('creates a password-less user with the username the allocator picked', async () => {
      repository.create.mockImplementation((data: Partial<User>) => data);
      repository.save.mockImplementation((data: Partial<User>) => data);

      const user = await service.createFromOAuth(oauthProfile);

      expect(usernames.available).toHaveBeenCalledWith('ada');
      expect(user).toMatchObject({
        email: 'ada@example.com',
        username: 'ada',
        password: null,
        profilePicture: null,
      });
    });

    describe('column length limits', () => {
      beforeEach(() => {
        repository.create.mockImplementation((data: Partial<User>) => data);
        repository.save.mockImplementation((data: Partial<User>) => data);
      });

      it('truncates first and last name to the column length', async () => {
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

  describe('findOneForViewer', () => {
    const stored = { id: 7, username: 'ada', email: 'ada@example.com' };

    it('gives the owner the whole profile', async () => {
      repository.findOneBy.mockResolvedValue(stored);

      await expect(service.findOneForViewer(7, 7)).resolves.toBe(stored);
    });

    it('gives anyone else the public fields only, never the email', async () => {
      repository.findOneBy.mockResolvedValue(stored);

      const seen = await service.findOneForViewer(7, 8);

      expect(seen).toBeInstanceOf(PublicUserDto);
      expect(seen).not.toHaveProperty('email');
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

    it('checks a new password against the profile it is saved with', async () => {
      await service.update(1, {
        password: 'brand new pass',
        firstName: 'Augusta',
        currentPassword: 'current pass',
      });

      expect(passwordStrength.assertStrong).toHaveBeenCalledWith(
        'brand new pass',
        expect.objectContaining({ firstName: 'Augusta' }),
      );
    });

    it('refuses a weak new password with 422, saving nothing', async () => {
      passwordStrength.assertStrong.mockImplementationOnce(weak);

      await expect(
        service.update(1, {
          password: 'motdepasse',
          currentPassword: 'current pass',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('asks for the current password before judging the new one', async () => {
      await expect(
        service.update(1, { password: 'brand new pass', currentPassword: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(passwordStrength.assertStrong).not.toHaveBeenCalled();
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

    it('remove throws 404 and deletes nothing', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('setPicture throws 404 before storing anything', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(
        service.setPicture(999, Buffer.from('png')),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(pictures.storeFor).not.toHaveBeenCalled();
    });
  });

  describe('the picture file follows its column', () => {
    const withPicture = (profilePicture: string | null) =>
      Object.assign(new User(), { id: 7, profilePicture });

    beforeEach(() => {
      repository.save.mockImplementation((user: User) => Promise.resolve(user));
    });

    it('setPicture points the row at the new file, then deletes the old one', async () => {
      repository.findOneBy.mockResolvedValue(withPicture('old.png'));

      const user = await service.setPicture(7, Buffer.from('png'));

      expect(user.profilePicture).toBe('new.png');
      expect(pictures.delete).toHaveBeenCalledWith('old.png');
    });

    it('clearPicture sets null and deletes the file', async () => {
      repository.findOneBy.mockResolvedValue(withPicture('old.png'));

      const user = await service.clearPicture(7);

      expect(user.profilePicture).toBeNull();
      expect(pictures.delete).toHaveBeenCalledWith('old.png');
    });

    it('remove deletes the account, then its picture', async () => {
      repository.findOneBy.mockResolvedValue(withPicture('old.png'));

      await service.remove(7);

      expect(repository.delete).toHaveBeenCalledWith(7);
      expect(pictures.delete).toHaveBeenCalledWith('old.png');
    });
  });
});
