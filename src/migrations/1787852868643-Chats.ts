import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Chats1787852868643 implements MigrationInterface {
  name = 'Chats1787852868643';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum" AS ENUM('private', 'vacancy', 'event', 'content', 'favorites')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chats" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "public"."chats_type_enum" NOT NULL, "dedupeKey" text NOT NULL, "postId" uuid, "ownerId" uuid, "writeRestricted" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_59120fd3ca1af58cb1d0f5b5c6d" UNIQUE ("dedupeKey"), CONSTRAINT "chats_write_restricted_chk" CHECK ("type" = 'event' OR "writeRestricted" = false), CONSTRAINT "chats_post_link_chk" CHECK (("type" IN ('vacancy', 'event', 'content')) = ("postId" IS NOT NULL)), CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_participants" ("chatId" uuid NOT NULL, "userId" uuid NOT NULL, "canWrite" boolean NOT NULL DEFAULT true, "lastReadAt" TIMESTAMP WITH TIME ZONE, "archivedAt" TIMESTAMP WITH TIME ZONE, "removedAt" TIMESTAMP WITH TIME ZONE, "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d3101b19215e8540d891f98c065" PRIMARY KEY ("chatId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "chat_participants_user_idx" ON "chat_participants"  ("userId") WHERE "removedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "chatId" uuid NOT NULL, "authorId" uuid NOT NULL, "body" text NOT NULL DEFAULT '', "postId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "editedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "messages_payload_chk" CHECK ("body" <> '' OR "postId" IS NOT NULL), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "messages_chat_created_at_id_idx" ON "messages"  ("chatId", "createdAt", "id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_3b11da95697f6aa0d5bcd6d1dce" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_40d195fcbaada4020f429df8b48" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "FK_fb6add83b1a7acc94433d385692" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_36bc604c820bb9adc4c75cd4115" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_819e6bb0ee78baf73c398dc707f" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_486188c4a4a675cb8487aca43e1" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_486188c4a4a675cb8487aca43e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_819e6bb0ee78baf73c398dc707f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_36bc604c820bb9adc4c75cd4115"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_fb6add83b1a7acc94433d385692"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "FK_e16675fae83bc603f30ae8fbdd5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_40d195fcbaada4020f429df8b48"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_3b11da95697f6aa0d5bcd6d1dce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."messages_chat_created_at_id_idx"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP INDEX "public"."chat_participants_user_idx"`);
    await queryRunner.query(`DROP TABLE "chat_participants"`);
    await queryRunner.query(`DROP TABLE "chats"`);
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
  }
}
