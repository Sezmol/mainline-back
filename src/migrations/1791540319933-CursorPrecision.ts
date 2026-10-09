import { type MigrationInterface, type QueryRunner } from 'typeorm';

const COLUMNS = [
  ['posts', 'createdAt'],
  ['messages', 'createdAt'],
  ['notifications', 'createdAt'],
  ['likes', 'createdAt'],
  ['companies', 'createdAt'],
  ['company_members', 'joinedAt'],
  ['chats', 'lastMessageAt'],
  ['chat_participants', 'lastReadAt'],
] as const;

export class CursorPrecision1791540319933 implements MigrationInterface {
  name = 'CursorPrecision1791540319933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP(3) WITH TIME ZONE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column] of COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TIMESTAMP WITH TIME ZONE`,
      );
    }
  }
}
