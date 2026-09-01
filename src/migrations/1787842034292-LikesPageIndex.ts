import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class LikesPageIndex1787842034292 implements MigrationInterface {
  name = 'LikesPageIndex1787842034292';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."likes_post_id_idx"`);
    await queryRunner.query(
      `CREATE INDEX "likes_post_created_at_user_id_idx" ON "likes"  ("postId", "createdAt", "userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."likes_post_created_at_user_id_idx"`,
    );
    await queryRunner.query(
      `CREATE INDEX "likes_post_id_idx" ON "likes" USING btree ("postId") `,
    );
  }
}
