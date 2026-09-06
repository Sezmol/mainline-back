import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Companies1788220800000 implements MigrationInterface {
  name = 'Companies1788220800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."company_members_role_enum" AS ENUM('owner', 'hr', 'manager', 'employee')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_scope_enum" AS ENUM('company', 'department', 'team')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_status_enum" AS ENUM('pending', 'accepted', 'declined')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_role_enum" AS ENUM('owner', 'hr', 'manager', 'employee')`,
    );

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" text NOT NULL,
        "name" character varying(100) NOT NULL,
        "logoUrl" text,
        "description" text,
        "website" text,
        "location" character varying(120),
        "socialLinks" text array NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "companies_slug_uq" UNIQUE ("slug"),
        CONSTRAINT "companies_pk" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "company_members" (
        "companyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" "public"."company_members_role_enum" NOT NULL DEFAULT 'employee',
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "company_members_pk" PRIMARY KEY ("companyId", "userId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "company_members_user_idx" ON "company_members" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "company_members_single_owner_idx" ON "company_members" ("companyId") WHERE "role" = 'owner'`,
    );

    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "name" character varying(60) NOT NULL,
        "managerId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "departments_company_name_uq" UNIQUE ("companyId", "name"),
        CONSTRAINT "departments_id_company_uq" UNIQUE ("id", "companyId"),
        CONSTRAINT "departments_pk" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "department_members" (
        "departmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "companyId" uuid NOT NULL,
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "department_members_pk" PRIMARY KEY ("departmentId", "userId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "department_members_company_user_idx" ON "department_members" ("companyId", "userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "name" character varying(60) NOT NULL,
        "description" text,
        "managerId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "teams_company_name_uq" UNIQUE ("companyId", "name"),
        CONSTRAINT "teams_pk" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "teamId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "team_members_pk" PRIMARY KEY ("teamId", "userId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "team_members_user_idx" ON "team_members" ("userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "scope" "public"."invites_scope_enum" NOT NULL,
        "companyId" uuid,
        "departmentId" uuid,
        "teamId" uuid,
        "role" "public"."invites_role_enum",
        "inviterId" uuid NOT NULL,
        "inviteeId" uuid NOT NULL,
        "status" "public"."invites_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "decidedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "invites_scope_target_chk" CHECK (
          ("scope" = 'company') = ("companyId" IS NOT NULL AND "departmentId" IS NULL AND "teamId" IS NULL)
          AND ("scope" = 'department') = ("departmentId" IS NOT NULL AND "teamId" IS NULL)
          AND ("scope" = 'team') = ("teamId" IS NOT NULL AND "departmentId" IS NULL)
          AND ("role" IS NULL OR "scope" = 'company')
        ),
        CONSTRAINT "invites_pk" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "invites_invitee_idx" ON "invites" ("inviteeId", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "invites_company_pending_uq" ON "invites" ("companyId", "inviteeId") WHERE "status" = 'pending' AND "scope" = 'company'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "invites_department_pending_uq" ON "invites" ("departmentId", "inviteeId") WHERE "status" = 'pending' AND "scope" = 'department'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "invites_team_pending_uq" ON "invites" ("teamId", "inviteeId") WHERE "status" = 'pending' AND "scope" = 'team'`,
    );

    await queryRunner.query(
      `ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_fk" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ADD CONSTRAINT "departments_company_fk" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_fk" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_fk" FOREIGN KEY ("departmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "department_members" ADD CONSTRAINT "department_members_membership_fk" FOREIGN KEY ("companyId", "userId") REFERENCES "company_members"("companyId", "userId") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "teams_company_fk" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_fk" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_fk" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "invites_company_fk" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "invites_department_fk" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "invites_team_fk" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "invites_inviter_fk" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "invites_invitee_fk" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "invites"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "department_members"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TABLE "company_members"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."invites_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."invites_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."invites_scope_enum"`);
    await queryRunner.query(`DROP TYPE "public"."company_members_role_enum"`);
  }
}
