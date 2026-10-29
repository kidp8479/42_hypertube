// Migration: index the owner column of oauth_account (HYP-112).
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes `oauth_account.userId`. Postgres does not index a foreign key on
 * its own; the email claim deletes by owner and a user deletion cascades
 * by it. Adding or dropping an index changes no data.
 */
export class OauthAccountUserIndex1793261038144 implements MigrationInterface {
  name = 'OauthAccountUserIndex1793261038144';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_a9124d5956d6244b17bdd67f92" ON "oauth_account"  ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9124d5956d6244b17bdd67f92"`,
    );
  }
}
