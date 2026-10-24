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
    // A database that already holds `Ada` and `ada` cannot take the index:
    // fail with the names to rename instead of a bare unique-violation, since
    // the app runs this at boot and would otherwise refuse to start unexplained.
    const clashes = (await queryRunner.query(
      `SELECT LOWER("username") AS "name" FROM "user" GROUP BY 1 HAVING COUNT(*) > 1`,
    )) as { name: string }[];
    if (clashes.length > 0) {
      throw new Error(
        `Usernames that differ only by case, rename them first: ${clashes.map((row) => row.name).join(', ')}`,
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_username_lower" ON "user" (LOWER("username"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_user_username_lower"`);
  }
}
