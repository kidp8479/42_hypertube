// Migration: profilePicture holds an uploaded file name, not a linked URL
// (HYP-38, ADR-0016). Dropping the column on purpose: the linked URLs it held
// are no file of ours, so every account starts back on the default avatar.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class HostedProfilePictures1793449771882 implements MigrationInterface {
  name = 'HostedProfilePictures1793449771882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profilePicture"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "profilePicture" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "profilePicture"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "profilePicture" character varying(500)`,
    );
  }
}
