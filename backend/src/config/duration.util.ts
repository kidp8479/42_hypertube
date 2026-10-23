const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/**
 * Turns the `<number><s|m|h|d>` strings the env schema accepts (`15m`, `7d`)
 * into milliseconds, for the places that need a number (a cookie's Max-Age, a
 * database expiry) rather than the string `@nestjs/jwt` takes as is. Anything
 * else throws: the schema has already rejected it, so reaching here with one
 * is a bug, not user input.
 */
export function parseDuration(text: string): number {
  const match = /^(\d+)([smhd])$/.exec(text);
  if (!match) {
    throw new Error(`Invalid duration "${text}", expected <number><s|m|h|d>`);
  }
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}
