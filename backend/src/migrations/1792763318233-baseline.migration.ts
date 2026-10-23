import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1792763318233 implements MigrationInterface {
  name = 'Baseline1792763318233';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_preferredlanguage_enum" AS ENUM('en', 'fr')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "username" character varying(30) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "password" character varying(255), "profilePicture" character varying(500), "preferredLanguage" "public"."user_preferredlanguage_enum" NOT NULL DEFAULT 'en', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oauth_account_provider_enum" AS ENUM('fortytwo', 'github')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_account" ("id" SERIAL NOT NULL, "provider" "public"."oauth_account_provider_enum" NOT NULL, "providerUserId" character varying(255) NOT NULL, "userId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e482e23febb23aeb59609c6c78d" UNIQUE ("provider", "providerUserId"), CONSTRAINT "PK_01ec7d2a8273dcaaed3dd10a4fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_account" ADD CONSTRAINT "FK_a9124d5956d6244b17bdd67f92b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oauth_account" DROP CONSTRAINT "FK_a9124d5956d6244b17bdd67f92b"`,
    );
    await queryRunner.query(`DROP TABLE "oauth_account"`);
    await queryRunner.query(`DROP TYPE "public"."oauth_account_provider_enum"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_preferredlanguage_enum"`);
  }
}
