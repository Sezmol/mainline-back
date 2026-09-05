import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Interactions1787841183295 implements MigrationInterface {
  name = 'Interactions1787841183295';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."interactions_kind_enum" AS ENUM('response', 'invite')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."interactions_status_enum" AS ENUM('pending', 'accepted', 'declined')`,
    );
    await queryRunner.query(
      `CREATE TABLE "interactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "postId" uuid NOT NULL, "userId" uuid NOT NULL, "kind" "public"."interactions_kind_enum" NOT NULL, "status" "public"."interactions_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "interactions_post_user_uq" UNIQUE ("postId", "userId"), CONSTRAINT "PK_911b7416a6671b4148b18c18ecb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "interactions" ADD CONSTRAINT "FK_ffa112c8cba931d6ff9336f0169" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interactions" ADD CONSTRAINT "FK_9992157cbe54583ff7002ae4c00" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interactions" DROP CONSTRAINT "FK_9992157cbe54583ff7002ae4c00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interactions" DROP CONSTRAINT "FK_ffa112c8cba931d6ff9336f0169"`,
    );
    await queryRunner.query(`DROP TABLE "interactions"`);
    await queryRunner.query(`DROP TYPE "public"."interactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."interactions_kind_enum"`);
  }
}
