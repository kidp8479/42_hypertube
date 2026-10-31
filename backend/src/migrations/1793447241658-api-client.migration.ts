// Migration: the api_client table behind POST /oauth/token (HYP-122).
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `api_client`: one row per API key, owned by a user (cascade on
 * delete, indexed owner), with a unique public `clientId` and the SHA-256 of
 * the secret. A new table, so no existing data is touched.
 */
export class ApiClient1793447241658 implements MigrationInterface {
  name = 'ApiClient1793447241658';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_client" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "name" character varying(50) NOT NULL, "clientId" character varying(32) NOT NULL, "secretHash" character(64) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3f93e3481d765915e0daa39c98c" UNIQUE ("clientId"), CONSTRAINT "PK_82a5ec6981d2be903a9eb1d9b9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de7e4aa46a0d9a38c195e95e24" ON "api_client"  ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_client" ADD CONSTRAINT "FK_de7e4aa46a0d9a38c195e95e24b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_client" DROP CONSTRAINT "FK_de7e4aa46a0d9a38c195e95e24b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_de7e4aa46a0d9a38c195e95e24"`,
    );
    await queryRunner.query(`DROP TABLE "api_client"`);
  }
}
