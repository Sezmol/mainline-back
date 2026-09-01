import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsModule } from '../chats/chats.module';
import { MessageEntity } from '../chats/infra/postgres/message.entity';
import { CompanyMemberEntity } from '../companies/infra/postgres/company-member.entity';
import { TeamMemberEntity } from '../companies/infra/postgres/team-member.entity';
import { InteractionEntity } from '../interactions/infra/postgres/interaction.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { PostAssigneeEntity } from './infra/postgres/post-assignee.entity';
import { PostLikeEntity } from './infra/postgres/post-like.entity';
import { PostEntity } from './infra/postgres/post.entity';
import { PostTypeormRepository } from './infra/postgres/post.typeorm.repository';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      PostLikeEntity,
      PostAssigneeEntity,
      InteractionEntity,
      MessageEntity,
      CompanyMemberEntity,
      TeamMemberEntity,
    ]),
    ChatsModule,
    ProjectsModule,
    NotificationsModule,
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    { provide: PostsRepository, useClass: PostTypeormRepository },
  ],
  exports: [PostsService, PostsRepository],
})
export class PostsModule {}
