// Unit spec for AuthService: credential checks, token minting, and the OAuth
// identity -> local user resolution (linking, password revocation, races).
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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

  describe('loginById', () => {
    it('loads the user and signs a token for them', async () => {
      users.findOne.mockResolvedValue(buildUser({ id: 7 }));
      jwt.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await service.loginById(7);

      expect(users.findOne).toHaveBeenCalledWith(7);
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 7 });
      expect(result).toEqual({ access_token: 'signed.jwt.token' });
    });

    it('answers 401, not 404, when the user was deleted since the code was issued', async () => {
      users.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.loginById(7)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('resolveOAuthUser', () => {
    // Deliberately mixed-case: exercises the email normalization.
    const profile: OAuthProfile = {
      provider: OAuthProvider.FORTYTWO,
      providerUserId: '12345',
      email: 'Ada@Example.com',
      suggestedUsername: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    beforeEach(() => {
      oauthAccounts.create.mockImplementation(
        (data: Partial<OAuthAccount>) => data,
      );
    });

    it('resolves an already-linked account without touching email lookup or creation', async () => {
      const linkedUser = buildUser({ id: 5 });
      oauthAccounts.findOneBy.mockResolvedValue({ userId: 5 });
      users.findOne.mockResolvedValue(linkedUser);

      const result = await service.resolveOAuthUser(profile);

      expect(users.findOne).toHaveBeenCalledWith(5);
      expect(users.findByEmail).not.toHaveBeenCalled();
      expect(users.createFromOAuth).not.toHaveBeenCalled();
      expect(oauthAccounts.save).not.toHaveBeenCalled();
      expect(result).toBe(linkedUser);
    });

    it('links to an existing account by normalized email', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(buildUser({ id: 9 }));

      await service.resolveOAuthUser(profile);

      // findByEmail receives the lower-cased address, not the raw
      // 'Ada@Example.com' of the profile: that is the casing a local account
      // is registered with.
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

    it('creates a fresh account when the email matches nobody', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.createFromOAuth.mockResolvedValue(buildUser({ id: 11 }));

      await service.resolveOAuthUser(profile);

      expect(users.createFromOAuth).toHaveBeenCalledWith({
        ...profile,
        email: 'ada@example.com',
      });
      expect(oauthAccounts.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 11 }),
      );
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
      const winner = buildUser({ id: 20 });
      users.findOne.mockResolvedValue(winner);

      const result = await service.resolveOAuthUser(profile);

      // Resolves to the winner's user (20), not the one this call tried
      // to create (30).
      expect(users.findOne).toHaveBeenCalledWith(20);
      expect(result).toBe(winner);
    });

    describe('losing the race to create the user', () => {
      // Both requests read "no link, no user with this email", then the
      // other one inserts first: this one's user insert hits a unique
      // constraint. The whole resolution runs again and sees what the
      // winner committed.
      beforeEach(() => {
        users.createFromOAuth.mockRejectedValueOnce(buildUniqueViolation());
      });

      it('resolves to the winner when it already holds the link', async () => {
        oauthAccounts.findOneBy
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ userId: 21 });
        users.findByEmail.mockResolvedValue(null);
        const winner = buildUser({ id: 21 });
        users.findOne.mockResolvedValue(winner);

        const result = await service.resolveOAuthUser(profile);

        expect(result).toBe(winner);
        expect(users.createFromOAuth).toHaveBeenCalledTimes(1);
        expect(oauthAccounts.save).not.toHaveBeenCalled();
      });

      it('links to a local account registered meanwhile, revoking its password first', async () => {
        // The winner is a local registration of the same address: the rerun
        // must take the normal linking path, not just return that user.
        oauthAccounts.findOneBy.mockResolvedValue(null);
        const registered = buildUser({ id: 22, password: '$argon2id$...' });
        users.findByEmail
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(registered);

        const result = await service.resolveOAuthUser(profile);

        expect(result).toBe(registered);
        expect(users.clearPassword).toHaveBeenCalledWith(22);
        expect(oauthAccounts.save).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 22 }),
        );
        expect(users.clearPassword.mock.invocationCallOrder[0]).toBeLessThan(
          oauthAccounts.save.mock.invocationCallOrder[0],
        );
      });

      it('runs again only once: a second unique violation is rethrown', async () => {
        oauthAccounts.findOneBy.mockResolvedValue(null);
        users.findByEmail.mockResolvedValue(null);
        const second = buildUniqueViolation();
        users.createFromOAuth.mockRejectedValueOnce(second);

        await expect(service.resolveOAuthUser(profile)).rejects.toBe(second);
        expect(users.createFromOAuth).toHaveBeenCalledTimes(2);
      });
    });

    it('rethrows a user insert failure that is not a unique violation, without running again', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.createFromOAuth.mockRejectedValue(new Error('connection lost'));

      await expect(service.resolveOAuthUser(profile)).rejects.toThrow(
        'connection lost',
      );
      expect(users.createFromOAuth).toHaveBeenCalledTimes(1);
    });

    it('rethrows a save failure that is not a unique violation', async () => {
      oauthAccounts.findOneBy.mockResolvedValue(null);
      users.findByEmail.mockResolvedValue(null);
      users.createFromOAuth.mockResolvedValue(buildUser({ id: 40 }));
      oauthAccounts.save.mockRejectedValue(new Error('connection lost'));

      await expect(service.resolveOAuthUser(profile)).rejects.toThrow(
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

        await service.resolveOAuthUser(profile);

        expect(users.clearPassword).toHaveBeenCalledWith(9);
      });

      it('leaves a password-less account alone', async () => {
        users.findByEmail.mockResolvedValue(
          buildUser({ id: 9, password: null }),
        );

        await service.resolveOAuthUser(profile);

        expect(users.clearPassword).not.toHaveBeenCalled();
      });

      it('does not revoke anything for a freshly created account', async () => {
        users.findByEmail.mockResolvedValue(null);
        users.createFromOAuth.mockResolvedValue(buildUser({ id: 11 }));

        await service.resolveOAuthUser(profile);

        expect(users.clearPassword).not.toHaveBeenCalled();
      });

      it('does not link the identity when revoking the password fails', async () => {
        users.findByEmail.mockResolvedValue(
          buildUser({ id: 9, password: 'argon2-hash' }),
        );
        users.clearPassword.mockRejectedValue(new Error('connection lost'));

        await expect(service.resolveOAuthUser(profile)).rejects.toThrow(
          'connection lost',
        );

        expect(oauthAccounts.save).not.toHaveBeenCalled();
      });
    });
  });
});
