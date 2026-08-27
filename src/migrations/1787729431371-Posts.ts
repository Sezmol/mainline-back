import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Posts1787729431371 implements MigrationInterface {
  name = 'Posts1787729431371';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."posts_type_enum" AS ENUM('content', 'vacancy', 'event')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."posts_direction_enum" AS ENUM('frontend', 'backend', 'qa', 'design', 'manager', 'hr')`,
    );
    await queryRunner.query(
      `CREATE TABLE "posts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "authorId" uuid NOT NULL, "type" "public"."posts_type_enum" NOT NULL DEFAULT 'content', "direction" "public"."posts_direction_enum" NOT NULL, "title" character varying(100) NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "posts_author_id_idx" ON "posts"  ("authorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "posts_created_at_id_idx" ON "posts"  ("createdAt", "id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" DROP CONSTRAINT "FK_c5a322ad12a7bf95460c958e80e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."posts_created_at_id_idx"`);
    await queryRunner.query(`DROP INDEX "public"."posts_author_id_idx"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP TYPE "public"."posts_direction_enum"`);
    await queryRunner.query(`DROP TYPE "public"."posts_type_enum"`);
  }
}
