// Migration: the refresh_token table for rotating refresh tokens (HYP-77, ADR-0011).
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshToken1792765757629 implements MigrationInterface {
  name = 'RefreshToken1792765757629';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "familyId" uuid NOT NULL, "tokenHash" character(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "familyStartedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "rotatedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_204f27bcee2b705b8230beaf414" UNIQUE ("tokenHash"), CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e913e288156c133999341156a" ON "refresh_token"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b803086815f2d539fe7a0349d1" ON "refresh_token"  ("familyId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b803086815f2d539fe7a0349d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e913e288156c133999341156a"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_token"`);
  }
}
