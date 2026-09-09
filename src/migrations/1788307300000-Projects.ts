import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Projects1788307300000 implements MigrationInterface {
  name = 'Projects1788307300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projects" (
         "id" uuid NOT NULL DEFAULT gen_random_uuid(),
         "teamId" uuid NOT NULL,
         "managerId" uuid NOT NULL,
         "name" character varying(100) NOT NULL,
         "description" text,
         "startDate" date,
         "endDate" date,
         "membersCanEditTasks" boolean NOT NULL DEFAULT true,
         "attachments" text array NOT NULL DEFAULT '{}',
         "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "projects_pk" PRIMARY KEY ("id"),
         CONSTRAINT "projects_team_name_uq" UNIQUE ("teamId", "name"),
         CONSTRAINT "projects_dates_chk" CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "startDate" <= "endDate")
       )`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_team_fk" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_fk" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "projects_team_id_idx" ON "projects" ("teamId")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."board_columns_kind_enum" AS ENUM('todo', 'doing', 'done')`,
    );
    await queryRunner.query(
      `CREATE TABLE "board_columns" (
         "id" uuid NOT NULL DEFAULT gen_random_uuid(),
         "projectId" uuid NOT NULL,
         "name" character varying(40) NOT NULL,
         "kind" "public"."board_columns_kind_enum" NOT NULL DEFAULT 'doing',
         "position" integer NOT NULL,
         CONSTRAINT "board_columns_pk" PRIMARY KEY ("id"),
         CONSTRAINT "board_columns_project_name_uq" UNIQUE ("projectId", "name")
       )`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_project_fk" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "board_columns_project_position_idx" ON "board_columns" ("projectId", "position")`,
    );

    await queryRunner.query(
      `CREATE TABLE "post_assignees" (
         "postId" uuid NOT NULL,
         "userId" uuid NOT NULL,
         "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         CONSTRAINT "post_assignees_pk" PRIMARY KEY ("postId", "userId")
       )`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_assignees" ADD CONSTRAINT "post_assignees_post_fk" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_assignees" ADD CONSTRAINT "post_assignees_user_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "post_assignees_user_id_idx" ON "post_assignees" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_content_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_event_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_vacancy_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."posts_type_enum" RENAME TO "posts_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."posts_type_enum" AS ENUM('content', 'vacancy', 'event', 'task')`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "type" TYPE "public"."posts_type_enum" USING "type"::"text"::"public"."posts_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "type" SET DEFAULT 'content'`,
    );
    await queryRunner.query(`DROP TYPE "public"."posts_type_enum_old"`);

    await queryRunner.query(`ALTER TABLE "posts" ADD "projectId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "deadline" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "status" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD "attachments" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "posts_project_fk" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `CREATE INDEX "posts_project_status_idx" ON "posts" ("projectId", "status")`,
    );

    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "posts_content_fields_chk" CHECK ("type" IN ('vacancy', 'event') OR "location" IS NULL)`,
    );
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_event_fields_chk" CHECK (("type" IN ('event', 'task')) = ("isPrivate" IS NOT NULL)
   AND ("participantLimit" IS NULL OR ("type" = 'event' AND "isPrivate" = false)))`);
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_task_fields_chk" CHECK (("type" = 'task') = ("status" IS NOT NULL)
   AND ("type" = 'task' OR ("projectId" IS NULL AND "deadline" IS NULL
                            AND cardinality("attachments") = 0)))`);
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_vacancy_fields_chk" CHECK (("type" = 'vacancy') = ("workFormat" IS NOT NULL)
   AND ("type" = 'vacancy' OR ("salaryMin" IS NULL AND "salaryMax" IS NULL))
   AND ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax"))`);

    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_post_link_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_group_title_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_write_restricted_chk"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."chats_type_enum" RENAME TO "chats_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum" AS ENUM('private', 'vacancy', 'event', 'content', 'task', 'favorites', 'company', 'department', 'team', 'project')`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ALTER COLUMN "type" TYPE "public"."chats_type_enum" USING "type"::"text"::"public"."chats_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_post_link_chk" CHECK (("type" IN ('vacancy', 'event', 'content', 'task')) = ("postId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_group_title_chk" CHECK (("type" IN ('company', 'department', 'team', 'project')) = ("title" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_write_restricted_chk" CHECK ("type" = 'event' OR "writeRestricted" = false)`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('response_received', 'response_accepted', 'response_declined', 'invite_received', 'invite_accepted', 'invite_declined', 'company_invite_received', 'company_invite_accepted', 'company_invite_declined', 'membership_removed', 'task_assigned')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type"::text = 'task_assigned'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('response_received', 'response_accepted', 'response_declined', 'invite_received', 'invite_accepted', 'invite_declined', 'company_invite_received', 'company_invite_accepted', 'company_invite_declined', 'membership_removed')`,
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
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_post_link_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "chats_write_restricted_chk"`,
    );
    await queryRunner.query(
      `DELETE FROM "chats" WHERE "type"::text IN ('task', 'project')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum_old" AS ENUM('private', 'vacancy', 'event', 'content', 'favorites', 'company', 'department', 'team')`,
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
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_group_title_chk" CHECK (("type" IN ('company', 'department', 'team')) = ("title" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chats_write_restricted_chk" CHECK ("type" = 'event' OR "writeRestricted" = false)`,
    );

    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_vacancy_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_task_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_event_fields_chk"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_content_fields_chk"`,
    );
    await queryRunner.query(`DROP INDEX "public"."posts_project_status_idx"`);
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "posts_project_fk"`,
    );
    await queryRunner.query(`DELETE FROM "posts" WHERE "type"::text = 'task'`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "attachments"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "deadline"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "projectId"`);
    await queryRunner.query(
      `CREATE TYPE "public"."posts_type_enum_old" AS ENUM('content', 'vacancy', 'event')`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "type" TYPE "public"."posts_type_enum_old" USING "type"::"text"::"public"."posts_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "type" SET DEFAULT 'content'`,
    );
    await queryRunner.query(`DROP TYPE "public"."posts_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."posts_type_enum_old" RENAME TO "posts_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "posts_content_fields_chk" CHECK ("type" <> 'content' OR "location" IS NULL)`,
    );
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_event_fields_chk" CHECK (("type" = 'event') = ("isPrivate" IS NOT NULL)
   AND ("participantLimit" IS NULL OR ("type" = 'event' AND "isPrivate" = false)))`);
    await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_vacancy_fields_chk" CHECK (("type" = 'vacancy') = ("workFormat" IS NOT NULL)
   AND ("type" = 'vacancy' OR ("salaryMin" IS NULL AND "salaryMax" IS NULL))
   AND ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax"))`);

    await queryRunner.query(`DROP INDEX "public"."post_assignees_user_id_idx"`);
    await queryRunner.query(`DROP TABLE "post_assignees"`);
    await queryRunner.query(
      `DROP INDEX "public"."board_columns_project_position_idx"`,
    );
    await queryRunner.query(`DROP TABLE "board_columns"`);
    await queryRunner.query(`DROP TYPE "public"."board_columns_kind_enum"`);
    await queryRunner.query(`DROP INDEX "public"."projects_team_id_idx"`);
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
