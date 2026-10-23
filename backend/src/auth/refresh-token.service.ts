import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { parseDuration } from '../config/duration.util';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  generateRefreshSecret,
  hashRefreshSecret,
} from './refresh-secret.util';

/** Longest a session may last from its login, however often it is refreshed. */
const ABSOLUTE_CAP_MS = 30 * 86_400_000;
/**
 * A token used again this soon after it was rotated is a race (two tabs, a
 * retried request), not theft: it gets a new token and the family lives on.
 */
const REUSE_LEEWAY_MS = 10_000;
/** Expired rows are deleted once they are this old (no scheduler, see issue). */
const PURGE_GRACE_MS = 86_400_000;

/** A freshly issued token: the secret goes in the cookie, nowhere else. */
export type IssuedRefreshToken = { secret: string; expiresAt: Date };

/**
 * Keeps sessions alive without keeping the short-lived access token alive
 * longer. Issues refresh tokens, rotates them on use (each use consumes the
 * token and hands back the next), and cuts off a whole session when a consumed
 * token shows up again, which means a copy of it was stolen (ADR-0011).
 */
@Injectable()
export class RefreshTokenService {
  private readonly ttlMs: number;

  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokens: Repository<RefreshToken>,
    config: ConfigService,
  ) {
    this.ttlMs = parseDuration(config.getOrThrow<string>('REFRESH_EXPIRES_IN'));
  }

  /** Starts a session (a new family) for a user who just authenticated. */
  async issue(userId: number): Promise<IssuedRefreshToken> {
    const now = new Date();
    await this.purgeExpired(now);
    return this.insert(userId, randomUUID(), now, now);
  }

  /**
   * Exchanges a refresh token for the next one in its session. Every failure
   * is the same 401, so a caller learns nothing about why.
   *
   * @throws {UnauthorizedException} 401 for an unknown, revoked, expired or
   * over-age token, and for a token already rotated (which also revokes its
   * session).
   */
  async rotate(
    secret: string,
  ): Promise<IssuedRefreshToken & { userId: number }> {
    const now = new Date();
    const row = await this.tokens.findOneBy({
      tokenHash: hashRefreshSecret(secret),
    });
    if (!row || this.isDead(row, now)) {
      throw new UnauthorizedException();
    }

    if (row.rotatedAt) {
      await this.rejectIfStolen(row, now);
    } else {
      await this.consume(row, now);
    }

    await this.purgeExpired(now);
    const next = await this.insert(
      row.userId,
      row.familyId,
      row.familyStartedAt,
      now,
    );
    return { ...next, userId: row.userId };
  }

  /** Ends the session a refresh token belongs to (logout). Never fails. */
  async revokeFamilyOf(secret: string): Promise<void> {
    const row = await this.tokens.findOneBy({
      tokenHash: hashRefreshSecret(secret),
    });
    if (row) {
      await this.revokeFamily(row.familyId, new Date());
    }
  }

  private isDead(row: RefreshToken, now: Date): boolean {
    return (
      row.revokedAt !== null ||
      row.expiresAt <= now ||
      now.getTime() - row.familyStartedAt.getTime() >= ABSOLUTE_CAP_MS
    );
  }

  /**
   * Marks the token consumed, only if nobody else did first. Losing that race
   * is fine as long as the session is still alive: it is the two-tabs case.
   */
  private async consume(row: RefreshToken, now: Date): Promise<void> {
    const { affected } = await this.tokens.update(
      { id: row.id, rotatedAt: IsNull(), revokedAt: IsNull() },
      { rotatedAt: now },
    );
    if (affected === 0) {
      const current = await this.tokens.findOneBy({ id: row.id });
      if (!current || current.revokedAt) {
        throw new UnauthorizedException();
      }
    }
  }

  /** A consumed token outside the leeway is a second copy: cut the session. */
  private async rejectIfStolen(row: RefreshToken, now: Date): Promise<void> {
    const sinceRotation = now.getTime() - (row.rotatedAt as Date).getTime();
    if (sinceRotation > REUSE_LEEWAY_MS) {
      await this.revokeFamily(row.familyId, now);
      throw new UnauthorizedException();
    }
  }

  private async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.tokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: now },
    );
  }

  private async insert(
    userId: number,
    familyId: string,
    familyStartedAt: Date,
    now: Date,
  ): Promise<IssuedRefreshToken> {
    const secret = generateRefreshSecret();
    // Sliding window, but never past the absolute cap of the session.
    const expiresAt = new Date(
      Math.min(
        now.getTime() + this.ttlMs,
        familyStartedAt.getTime() + ABSOLUTE_CAP_MS,
      ),
    );
    await this.tokens.save(
      this.tokens.create({
        userId,
        familyId,
        tokenHash: hashRefreshSecret(secret),
        expiresAt,
        familyStartedAt,
        rotatedAt: null,
        revokedAt: null,
      }),
    );
    return { secret, expiresAt };
  }

  private async purgeExpired(now: Date): Promise<void> {
    await this.tokens.delete({
      expiresAt: LessThan(new Date(now.getTime() - PURGE_GRACE_MS)),
    });
  }
}
