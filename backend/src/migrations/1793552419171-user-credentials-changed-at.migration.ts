// Migration: when an account last changed hands (HYP-149, ADR-0007).
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `user.credentialsChangedAt`, nullable: existing accounts never
 * changed hands, so every token they hold stays valid.
 */
export class UserCredentialsChangedAt1793552419171 implements MigrationInterface {
  name = 'UserCredentialsChangedAt1793552419171';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "credentialsChangedAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "credentialsChangedAt"`,
    );
  }
}
