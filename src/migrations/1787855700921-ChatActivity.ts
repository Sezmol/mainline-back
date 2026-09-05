import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class ChatActivity1787855700921 implements MigrationInterface {
  name = 'ChatActivity1787855700921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chats" ADD "lastMessageAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `UPDATE "chats" c SET "lastMessageAt" = coalesce((SELECT max(m."createdAt") FROM "messages" m WHERE m."chatId" = c."id"), c."createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "chats_last_message_at_idx" ON "chats"  ("lastMessageAt", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."chats_last_message_at_idx"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "lastMessageAt"`);
  }
}
