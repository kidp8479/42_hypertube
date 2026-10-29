// Unit spec for the rate-limit scaler and the named policies built on it.
// The policies are evaluated at import, so each case loads the module fresh
// under the environment it sets.

import { scaledThrottleLimit } from './throttle.config';

type ThrottleConfig = typeof import('./throttle.config');

const withMultiplier = <T>(multiplier: string | undefined, run: () => T): T => {
  const previous = process.env.THROTTLE_LIMIT_MULTIPLIER;
  if (multiplier === undefined) delete process.env.THROTTLE_LIMIT_MULTIPLIER;
  else process.env.THROTTLE_LIMIT_MULTIPLIER = multiplier;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.THROTTLE_LIMIT_MULTIPLIER;
    else process.env.THROTTLE_LIMIT_MULTIPLIER = previous;
  }
};

const loadWith = (multiplier: string | undefined): ThrottleConfig =>
  withMultiplier(multiplier, () => {
    let loaded: ThrottleConfig | undefined;
    jest.isolateModules(() => {
      loaded = jest.requireActual<ThrottleConfig>('./throttle.config');
    });
    return loaded as ThrottleConfig;
  });

const policies = (config: ThrottleConfig) => [
  config.DEFAULT_THROTTLE,
  config.LOGIN_THROTTLE,
  config.PROFILE_EDIT_THROTTLE,
  config.REGISTER_THROTTLE,
  config.REFRESH_THROTTLE,
  config.OAUTH_EXCHANGE_THROTTLE,
];

describe('scaledThrottleLimit', () => {
  it('keeps the base limit when no multiplier is set', () => {
    expect(withMultiplier(undefined, () => scaledThrottleLimit(5))).toBe(5);
  });

  it('multiplies the base limit by THROTTLE_LIMIT_MULTIPLIER', () => {
    expect(withMultiplier('100', () => scaledThrottleLimit(5))).toBe(500);
  });
});

describe('named throttle policies', () => {
  it('scale every limit with the multiplier and leave the windows alone', () => {
    const base = policies(loadWith(undefined));
    const scaled = policies(loadWith('3'));

    expect(scaled).toEqual(
      base.map(({ limit, ttl }) => ({ limit: limit * 3, ttl })),
    );
  });

  it('keep login the tightest per-minute ceiling (brute-force guard)', () => {
    const config = loadWith(undefined);
    const perMinute = policies(config).filter(
      (policy) => policy.ttl === config.LOGIN_THROTTLE.ttl,
    );

    expect(Math.min(...perMinute.map((policy) => policy.limit))).toBe(
      config.LOGIN_THROTTLE.limit,
    );
  });
});
