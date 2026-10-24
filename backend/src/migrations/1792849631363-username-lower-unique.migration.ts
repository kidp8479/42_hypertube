// Migration: a case-insensitive unique index on the username (HYP-33).
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes usernames unique whatever their case (`Ada` and `ada` clash), next to
 * the case-sensitive `UNIQUE ("username")` of the baseline. Written by hand:
 * TypeORM cannot model a functional index, and `make migration-check` ignores
 * an expression index, so the entity does not declare it (HYP-33).
 */
export class UsernameLowerUnique1792849631363 implements MigrationInterface {
  name = 'UsernameLowerUnique1792849631363';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_username_lower" ON "user" (LOWER("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_user_username_lower"`);
  }
}
