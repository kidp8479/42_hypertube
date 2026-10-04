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
