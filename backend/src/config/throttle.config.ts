/**
 * Scales a rate-limit ceiling by `THROTTLE_LIMIT_MULTIPLIER` (default 1), so
 * a dev stack can raise every limit at once without touching the production
 * values. Read from `process.env` at decoration time on purpose: `@Throttle`
 * arguments are evaluated when the controller module is imported, before
 * ConfigService exists. That is why the variable must come from the real
 * environment (docker-compose passes it through), not from a `.env` file read
 * later by ConfigModule. The env schema rejects any value other than 1 when
 * `NODE_ENV=production`.
 */
export const scaledThrottleLimit = (baseLimit: number): number =>
  baseLimit * Number(process.env.THROTTLE_LIMIT_MULTIPLIER ?? 1);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A rate-limit policy: at most `limit` requests per `ttl` milliseconds. */
export interface ThrottlePolicy {
  limit: number;
  ttl: number;
}

/** Every route, per client IP. Auth routes tighten it with `@Throttle`. */
export const DEFAULT_THROTTLE: ThrottlePolicy = {
  limit: scaledThrottleLimit(100),
  ttl: MINUTE,
};

/**
 * Brute-force ceiling on a password check: well below what a human login
 * needs and far under an automated guessing rate.
 */
export const LOGIN_THROTTLE: ThrottlePolicy = {
  limit: scaledThrottleLimit(5),
  ttl: MINUTE,
};

/**
 * A profile edit checks the current password when the email or the password
 * changes, so it is throttled like a login, with room for ordinary edits.
 */
export const PROFILE_EDIT_THROTTLE: ThrottlePolicy = {
  limit: scaledThrottleLimit(10),
  ttl: MINUTE,
};

/**
 * Registration is rare per real user: capped per hour to blunt sign-up spam
 * and (later) reset-email flooding from a single source.
 */
export const REGISTER_THROTTLE: ThrottlePolicy = {
  limit: scaledThrottleLimit(10),
  ttl: HOUR,
};

/**
 * The SPA refreshes on every load and on a 401, so higher than login; the
 * refresh token is no guessing target (256 random bits).
 */
export const REFRESH_THROTTLE: ThrottlePolicy = {
  limit: scaledThrottleLimit(20),
  ttl: MINUTE,
};

/** One exchange per OAuth sign-in; the code is single-use and short-lived. */
export const OAUTH_EXCHANGE_THROTTLE: ThrottlePolicy = {
  limit: scaledThrottleLimit(10),
  ttl: MINUTE,
};
