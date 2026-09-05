import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class FavoritesBackfill1787853656107 implements MigrationInterface {
  name = 'FavoritesBackfill1787853656107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "chats" ("type", "dedupeKey", "ownerId")
       SELECT 'favorites', 'favorites:' || "id", "id" FROM "users"
       ON CONFLICT ("dedupeKey") DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "chat_participants" ("chatId", "userId")
       SELECT "id", "ownerId" FROM "chats" WHERE "type" = 'favorites'
       ON CONFLICT ("chatId", "userId") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "chats" WHERE "type" = 'favorites'`);
  }
}
