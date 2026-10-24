// Migration: a case-insensitive unique index on the username (HYP-33).
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes usernames unique whatever their case (`Ada` and `ada` clash). The
 * existing case-sensitive `UNIQUE ("username")` stays: it is harmless next to
 * this index. TypeORM cannot model a functional index, so it is written by
 * hand and the entity declares it with `synchronize: false` (HYP-33).
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
