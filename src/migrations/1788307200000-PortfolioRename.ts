import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class PortfolioRename1788307200000 implements MigrationInterface {
  name = 'PortfolioRename1788307200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" RENAME TO "portfolio_items"`,
    );
    await queryRunner.query(
      `ALTER INDEX "projects_user_id_idx" RENAME TO "portfolio_items_user_id_idx"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "portfolio_items_user_id_idx" RENAME TO "projects_user_id_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "portfolio_items" RENAME TO "projects"`,
    );
  }
}
