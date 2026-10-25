// Migration: whether a provider vouched for the account's email (HYP-84).
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `user.emailVerified`. An existing account is verified when it has an
 * OAuth link: it was created from a provider's verified email, or linked
 * because a provider returned that same verified email (ADR-0007).
 */
export class UserEmailVerified1792938521642 implements MigrationInterface {
  name = 'UserEmailVerified1792938521642';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailVerified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "emailVerified" = true WHERE EXISTS (SELECT 1 FROM "oauth_account" WHERE "oauth_account"."userId" = "user"."id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "emailVerified"`);
  }
}
