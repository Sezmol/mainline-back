import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CompanyLinks1788220900000 implements MigrationInterface {
  name = 'CompanyLinks1788220900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "posts" ADD "companyId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "posts_company_fk" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "posts_company_created_at_id_idx" ON "posts" ("companyId", "createdAt", "id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_post_link_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_write_restricted_chk"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chats_type_enum" RENAME TO "chats_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum" AS ENUM('private', 'vacancy', 'event', 'content', 'favorites', 'company', 'department', 'team')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "type" TYPE "public"."chats_type_enum" USING "type"::"text"::"public"."chats_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum_old"`);
    await queryRunner.query(`ALTER TABLE "chats" ADD "title" text`);
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_post_link_chk" CHECK (("type" IN ('vacancy', 'event', 'content')) = ("postId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_write_restricted_chk" CHECK ("type" = 'event' OR "writeRestricted" = false)`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_group_title_chk" CHECK (("type" IN ('company', 'department', 'team')) = ("title" IS NOT NULL))`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('response_received', 'response_accepted', 'response_declined', 'invite_received', 'invite_accepted', 'invite_declined', 'company_invite_received', 'company_invite_accepted', 'company_invite_declined', 'membership_removed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD "inviteId" uuid`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD "companyId" uuid`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD "subject" text`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_invite_fk" FOREIGN KEY ("inviteId") REFERENCES "invites"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_fk" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "notifications_company_fk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "notifications_invite_fk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "subject"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "companyId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "inviteId"`,
    );
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type"::text LIKE 'company_invite_%' OR "type"::text = 'membership_removed'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('response_received', 'response_accepted', 'response_declined', 'invite_received', 'invite_accepted', 'invite_declined')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_group_title_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_write_restricted_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_post_link_chk"`,
    );
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "title"`);
    await queryRunner.query(
      `DELETE FROM "chats" WHERE "type"::text IN ('company', 'department', 'team')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum_old" AS ENUM('private', 'vacancy', 'event', 'content', 'favorites')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "type" TYPE "public"."chats_type_enum_old" USING "type"::"text"::"public"."chats_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."chats_type_enum_old" RENAME TO "chats_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_post_link_chk" CHECK (("type" IN ('vacancy', 'event', 'content')) = ("postId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_write_restricted_chk" CHECK ("type" = 'event' OR "writeRestricted" = false)`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."posts_company_created_at_id_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_company_fk"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "companyId"`);
  }
}
