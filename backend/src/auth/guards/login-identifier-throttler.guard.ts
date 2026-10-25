// Second brute-force ceiling on POST /auth/login, keyed on the identifier.
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Counts login attempts per identifier (username or email) instead of per
 * client IP. Usernames are listed to every signed-in user (`GET /users`), so
 * the global per-IP counter alone lets an attacker spread guesses on one
 * account over many IPs. This guard applies the route's `@Throttle` limit a second time,
 * keyed on the identifier.
 *
 * The key is the identifier trimmed and lower-cased, the way
 * `UsersService.findForLogin` matches it, so `Ada` and ` ada ` share one
 * counter. An unknown identifier counts the same way, so a 429 does not
 * reveal whether the account exists.
 */
@Injectable()
export class LoginIdentifierThrottlerGuard extends ThrottlerGuard {
  // Runs before the validation pipe: a malformed body still gets a key.
  // The prefix keeps an identifier from sharing a counter with an IP.
  protected getTracker(req: Request): Promise<string> {
    const body = req.body as { identifier?: unknown } | undefined;
    const identifier = body?.identifier;
    const key =
      typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    return Promise.resolve(`login:${key}`);
  }

  // Leaves the X-RateLimit-* and Retry-After headers to the per-IP counter:
  // this one's remaining count would tell the caller how many attempts other
  // people made on the same username.
  protected setResponseHeader(): void {}
}
