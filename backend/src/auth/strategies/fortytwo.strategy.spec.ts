import { ConfigService } from '@nestjs/config';
import { FortyTwoStrategy } from './fortytwo.strategy';
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

// Structurally matches the strategy's private FortyTwoProfile - not
// imported since the type isn't exported, but the field set is what
// userProfile()'s done() callback actually hands back.
type FortyTwoProfileResult = {
  id: number;
  email: string;
  login: string;
  first_name: string;
  last_name: string;
};

describe('FortyTwoStrategy', () => {
  let strategy: FortyTwoStrategy;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    strategy = new FortyTwoStrategy(buildConfig());
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  // Promisifies the done()-callback API so tests read like the rest of
  // the suite (async/await), not a one-off done() callback style.
  const callUserProfile = (accessToken: string) =>
    new Promise<{ err: unknown; profile?: FortyTwoProfileResult }>(
      (resolve) => {
        strategy.userProfile(accessToken, (err, profile) =>
          resolve({ err, profile }),
        );
      },
    );

  describe('userProfile', () => {
    it('fetches /v2/me with the access token and resolves the profile', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          id: 1,
          email: 'ada@example.com',
          login: 'ada',
          first_name: 'Ada',
          last_name: 'Lovelace',
        }),
      );

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeUndefined();
      expect(profile?.email).toBe('ada@example.com');
      expect(fetchMock).toHaveBeenCalledWith('https://api.intra.42.fr/v2/me', {
        headers: { Authorization: 'Bearer a-token' },
      });
    });

    it('reports a fetch failure through done() rather than throwing', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeInstanceOf(Error);
      expect(profile).toBeUndefined();
    });

    it('reports a non-2xx answer through done() instead of using its body as a profile', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ message: 'rate limited' }, 429),
      );

      const { err, profile } = await callUserProfile('a-token');

      expect(err).toBeInstanceOf(Error);
      expect(profile).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('maps a 42 profile to OAuthProfile, trusting the email as verified', () => {
      const result = strategy.validate('token', 'refresh', {
        id: 1,
        email: 'ada@example.com',
        login: 'ada',
        first_name: 'Ada',
        last_name: 'Lovelace',
      });

      expect(result).toEqual({
        provider: OAuthProvider.FORTYTWO,
        providerUserId: '1',
        email: 'ada@example.com',
        emailVerified: true,
        suggestedUsername: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });
  });
});
