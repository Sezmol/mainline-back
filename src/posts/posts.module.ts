import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostLikeEntity } from './infra/postgres/post-like.entity';
import { PostEntity } from './infra/postgres/post.entity';
import { PostTypeormRepository } from './infra/postgres/post.typeorm.repository';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, PostLikeEntity])],
  controllers: [PostsController],
  providers: [
    PostsService,
    { provide: PostsRepository, useClass: PostTypeormRepository },
  ],
})
export class PostsModule {}
