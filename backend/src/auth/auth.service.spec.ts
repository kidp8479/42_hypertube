import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { OAuthAccount, OAuthProvider } from './entities/oauth-account.entity';
import { OAuthProfile } from './strategies/oauth-profile.interface';
import { UNIQUE_VIOLATION } from '../common/filters/query-failed.filter';
import { JwtService } from '@nestjs/jwt';

// Only the methods a spec actually drives need a precise type; the rest of
// the fake stays loose.
type UsersServiceMock = {
  findByEmail: jest.Mock;
  findOne: jest.Mock;
  createFromOAuth: jest.Mock;
  clearPassword: jest.Mock;
};

type JwtServiceMock = {
  signAsync: jest.Mock;
};

type OAuthAccountRepositoryMock = {
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

// A Postgres unique-violation error, shaped like what the `pg` driver
// throws and TypeORM wraps as a `QueryFailedError` (see
// `QueryFailedFilter`).
const buildUniqueViolation = () =>
  Object.assign(
    new QueryFailedError('INSERT INTO "oauth_account"...', [], new Error()),
    { code: UNIQUE_VIOLATION },
  );

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
  let jwt: JwtServiceMock;
  let oauthAccounts: OAuthAccountRepositoryMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            createFromOAuth: jest.fn(),
            clearPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: getRepositoryToken(OAuthAccount),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    // `.compile()` does not run lifecycle hooks; `onModuleInit` seeds the
    // dummy hash that the "unknown email" path relies on.
    await module.init();

    service = module.get<AuthService>(AuthService);
    users = module.get(UsersService);
    jwt = module.get(JwtService);
    oauthAccounts = module.get(getRepositoryToken(OAuthAccount));
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

  describe('login', () => {
    it('signs a payload holding only the user id (ADR-0002)', async () => {
      jwt.signAsync.mockResolvedValue('signed.jwt.token');
      const user = buildUser({ id: 7, username: 'ada' });

      const result = await service.login(user);

      expect(result).toEqual({ access_token: 'signed.jwt.token' });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 7 });
    });
  });

  describe('loginWithOAuth', () => {
    // Deliberately mixed-case: exercises the normalization the fix added.
    const profile: OAuthProfile = {
      provider: OAuthProvider.FORTYTWO,
      providerUserId: '12345',
      email: 'Ada@Example.com',
      emailVerified: true,
      suggestedUsername: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    beforeEach(() => {
      jwt.signAsync.mockResolvedValue('signed.jwt.token');
      oauthAccounts.create.mockImplementation(
        (data: Partial<OAuthAccount>) => data,
      );
    });

    it('logs in through an already-linked account without touching email lookup or creation', async () => {
      oauthAccounts.findOneBy.mockResolvedValue({ userId: 5 });
      users.findOne.mockResolvedValue(buildUser({ id: 5 }));

      const result = await service.loginWithOAuth(profile);

      expect(users.findOne).toHaveBeenCalledWith(5);
      expect(users.findByEmail).not.toHaveBeenCalled();
      expect(users.createFromOAuth).not.toHaveBeenCalled();
      expect(oauthAccounts.save).not.toHaveBeenCalled();
      expect(result).toEqual({ access_token: 'signed.jwt.token' });
    });

    it('links to an existing account by normalized email when the provider vouches it', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(buildUser({ id: 9 }));

      await service.loginWithOAuth(profile);

      // Not the raw 'Ada@Example.com' the profile carried - the fix this
      // locks in: findByEmail must see the same casing a local account
      // was registered with.
      expect(users.findByEmail).toHaveBeenCalledWith('ada@example.com');
      expect(users.createFromOAuth).not.toHaveBeenCalled();
      expect(oauthAccounts.save).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: OAuthProvider.FORTYTWO,
          providerUserId: '12345',
          userId: 9,
        }),
      );
    });

    it('creates a fresh account when the email is verified but matches nobody', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.createFromOAuth.mockResolvedValue(buildUser({ id: 11 }));

      await service.loginWithOAuth(profile);

      expect(users.createFromOAuth).toHaveBeenCalledWith({
        ...profile,
        email: 'ada@example.com',
      });
      expect(oauthAccounts.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 11 }),
      );
    });

    it('creates a fresh account without an email lookup when the provider does not vouch for it', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.createFromOAuth.mockResolvedValue(buildUser({ id: 12 }));

      await service.loginWithOAuth({ ...profile, emailVerified: false });

      expect(users.findByEmail).not.toHaveBeenCalled();
      expect(users.createFromOAuth).toHaveBeenCalled();
    });

    it('recovers from a concurrent link race instead of surfacing the conflict', async () => {
      // First check: not linked yet, so this request goes on to create the
      // link itself. A second, concurrent callback for the same 42 account
      // wins that race and commits first.
      oauthAccounts.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 20 });
      users.findByEmail.mockResolvedValue(null);
      users.createFromOAuth.mockResolvedValue(buildUser({ id: 30 }));
      oauthAccounts.save.mockRejectedValue(buildUniqueViolation());
      users.findOne.mockResolvedValue(buildUser({ id: 20 }));

      const result = await service.loginWithOAuth(profile);

      // Signs in as the winner's user (20), not the one this call tried
      // to create (30).
      expect(users.findOne).toHaveBeenCalledWith(20);
      expect(result).toEqual({ access_token: 'signed.jwt.token' });
    });

    it('rethrows a save failure that is not a unique violation', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.createFromOAuth.mockResolvedValue(buildUser({ id: 40 }));
      oauthAccounts.save.mockRejectedValue(new Error('connection lost'));

      await expect(service.loginWithOAuth(profile)).rejects.toThrow(
        'connection lost',
      );
    });

    describe('linking to an existing local account', () => {
      // Local registration does not verify the email, so whoever registered
      // it may not own the address. Once the real owner signs in through a
      // provider and gets linked, the password that account was created
      // with must stop working (account pre-hijacking).
      beforeEach(() => {
        oauthAccounts.findOneBy.mockResolvedValue(null);
      });

      it('revokes the local password of the account it links to', async () => {
        users.findByEmail.mockResolvedValue(
          buildUser({ id: 9, password: 'argon2-hash' }),
        );

        await service.loginWithOAuth(profile);

        expect(users.clearPassword).toHaveBeenCalledWith(9);
      });

      it('leaves a password-less account alone', async () => {
        users.findByEmail.mockResolvedValue(
          buildUser({ id: 9, password: null }),
        );

        await service.loginWithOAuth(profile);

        expect(users.clearPassword).not.toHaveBeenCalled();
      });

      it('does not revoke anything for a freshly created account', async () => {
        users.findByEmail.mockResolvedValue(null);
        users.createFromOAuth.mockResolvedValue(buildUser({ id: 11 }));

        await service.loginWithOAuth(profile);

        expect(users.clearPassword).not.toHaveBeenCalled();
      });

      it('does not revoke when the link was never created', async () => {
        users.findByEmail.mockResolvedValue(
          buildUser({ id: 9, password: 'argon2-hash' }),
        );
        oauthAccounts.save.mockRejectedValue(new Error('connection lost'));

        await expect(service.loginWithOAuth(profile)).rejects.toThrow();

        expect(users.clearPassword).not.toHaveBeenCalled();
      });
    });
  });
});
