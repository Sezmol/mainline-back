import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class PostTypes1787759537723 implements MigrationInterface {
  name = 'PostTypes1787759537723';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "location" character varying(120)`,
    );
    await queryRunner.query(`ALTER TABLE "posts" ADD "salaryMin" integer`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "salaryMax" integer`);
    await queryRunner.query(
      `CREATE TYPE "public"."posts_workformat_enum" AS ENUM('onsite', 'remote', 'hybrid')`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "workFormat" "public"."posts_workformat_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" ADD "isPrivate" boolean`);
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "participantLimit" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "posts_content_fields_chk" CHECK ("type" <> 'content' OR "location" IS NULL)`,
    );
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_event_fields_chk" CHECK (("type" = 'event') = ("isPrivate" IS NOT NULL)
   AND ("participantLimit" IS NULL OR ("type" = 'event' AND "isPrivate" = false)))`);
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_vacancy_fields_chk" CHECK (("type" = 'vacancy') = ("workFormat" IS NOT NULL)
   AND ("type" = 'vacancy' OR ("salaryMin" IS NULL AND "salaryMax" IS NULL))
   AND ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_vacancy_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_event_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_content_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP COLUMN "participantLimit"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "isPrivate"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "workFormat"`);
    await queryRunner.query(`DROP TYPE "public"."posts_workformat_enum"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "salaryMax"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "salaryMin"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "location"`);
  }
}
