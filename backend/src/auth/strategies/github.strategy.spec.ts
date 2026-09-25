import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GithubStrategy } from './github.strategy';
import { OAuthProvider } from '../entities/oauth-account.entity';

const buildConfig = () =>
  ({
    getOrThrow: (key: string) => `${key}-value`,
  }) as unknown as ConfigService;

// Minimal Response-shaped stub - userProfile only reads .ok, .status and .json().
const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

// Structurally matches the strategy's private GithubProfile - not
// imported since the type isn't exported, but the field set is what
// userProfile()'s done() callback actually hands back.
type GithubProfileResult = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
};

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    strategy = new GithubStrategy(buildConfig());
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  // Promisifies the done()-callback API so tests read like the rest of
  // the suite (async/await), not a one-off done() callback style.
  const callUserProfile = (accessToken: string) =>
    new Promise<{ err: unknown; profile?: GithubProfileResult }>((resolve) => {
      strategy.userProfile(accessToken, (err, profile) =>
        resolve({ err, profile }),
      );
    });

  describe('userProfile', () => {
    it('resolves straight from /user when its email is public', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          login: 'ada',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
        }),
      );

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeUndefined();
      expect(profile?.email).toBe('ada@example.com');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/user', {
        headers: {
          Authorization: 'Bearer a-token',
          'User-Agent': 'hypertube',
        },
      });
    });

    it('falls back to the primary verified address from /user/emails when /user hides it', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ id: 1, login: 'ada', name: null, email: null }),
        )
        .mockResolvedValueOnce(
          jsonResponse([
            { email: 'old@example.com', primary: false, verified: true },
            { email: 'unverified@example.com', primary: true, verified: false },
            { email: 'ada@example.com', primary: true, verified: true },
          ]),
        );

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeUndefined();
      expect(profile?.email).toBe('ada@example.com');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://api.github.com/user/emails',
        expect.anything(),
      );
    });

    it('resolves a null email when no address is both primary and verified', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ id: 1, login: 'ada', name: null, email: null }),
        )
        .mockResolvedValueOnce(
          jsonResponse([
            { email: 'unverified@example.com', primary: true, verified: false },
          ]),
        );

      const { profile } = await callUserProfile('a-token');

      expect(profile?.email).toBeNull();
    });

    it('reports a fetch failure through done() rather than throwing', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeInstanceOf(Error);
      expect(profile).toBeUndefined();
    });

    it('reports a non-2xx answer from /user through done()', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Bad' }, 401));

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeInstanceOf(Error);
      expect(profile).toBeUndefined();
    });

    it('reports a non-2xx answer from /user/emails through done()', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ id: 1, login: 'ada', name: null, email: null }),
        )
        .mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403));

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeInstanceOf(Error);
      expect(profile).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('maps a complete profile to OAuthProfile', () => {
      const result = strategy.validate('token', 'refresh', {
        id: 1,
        login: 'ada',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      });

      expect(result).toEqual({
        provider: OAuthProvider.GITHUB,
        providerUserId: '1',
        email: 'ada@example.com',
        emailVerified: true,
        suggestedUsername: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });

    it('keeps everything past the first word as the last name', () => {
      const result = strategy.validate('token', 'refresh', {
        id: 2,
        login: 'countess',
        name: 'Ada Lovelace Byron',
        email: 'ada@example.com',
      });

      expect(result.firstName).toBe('Ada');
      expect(result.lastName).toBe('Lovelace Byron');
    });

    it('falls back to the login for both names when name is null', () => {
      const result = strategy.validate('token', 'refresh', {
        id: 3,
        login: 'ghost',
        name: null,
        email: 'ghost@example.com',
      });

      expect(result.firstName).toBe('ghost');
      expect(result.lastName).toBe('ghost');
    });

    it('throws when no verified email could be resolved', () => {
      expect(() =>
        strategy.validate('token', 'refresh', {
          id: 4,
          login: 'ada',
          name: 'Ada',
          email: null,
        }),
      ).toThrow(UnauthorizedException);
    });
  });
});
