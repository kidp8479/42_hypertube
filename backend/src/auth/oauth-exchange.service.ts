// Single-use codes carrying an OAuth login from the callback to the SPA.
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

const CODE_TTL_MS = 60 * 1000;

/**
 * Single-use, short-lived codes that carry an OAuth login from the callback
 * (a server-side redirect, so no SPA code runs yet) to the SPA, which trades
 * the code for the real JWT with a normal fetch. The JWT itself never goes
 * in a URL, where it would leak into browser history and access logs
 * (ADR-0007).
 *
 * Held in memory, which is enough for a single instance (same reasoning as
 * the rate limiter): a restart drops in-flight codes and the user simply
 * retries the login. It stores the user id, not a JWT, so the token is
 * minted only at redeem time.
 */
@Injectable()
export class OAuthExchangeService {
  private readonly codes = new Map<
    string,
    { userId: number; expiresAt: number }
  >();

  issue(userId: number): string {
    this.dropExpired();
    const code = randomBytes(32).toString('base64url');
    this.codes.set(code, { userId, expiresAt: Date.now() + CODE_TTL_MS });
    return code;
  }

  /**
   * Returns the user id the code was issued for, or `undefined` when the
   * code is unknown, already used or expired (deliberately not told apart,
   * so a caller learns nothing about which one it was). The code is
   * deleted on the first call, valid or not.
   */
  redeem(code: string): number | undefined {
    const entry = this.codes.get(code);
    this.codes.delete(code);
    return entry && entry.expiresAt > Date.now() ? entry.userId : undefined;
  }

  // Codes that are never redeemed (abandoned logins) would otherwise stay
  // in the map forever; sweeping on issue keeps it bounded without a timer.
  private dropExpired() {
    const now = Date.now();
    for (const [code, { expiresAt }] of this.codes) {
      if (expiresAt <= now) this.codes.delete(code);
    }
  }
}
