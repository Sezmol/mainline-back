import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsModule } from '../chats/chats.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsModule } from '../posts/posts.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { InteractionEntity } from './infra/postgres/interaction.entity';
import { InteractionTypeormRepository } from './infra/postgres/interaction.typeorm.repository';
import { InteractionsController } from './interactions.controller';
import { InteractionsRepository } from './interactions.repository';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InteractionEntity]),
    PostsModule,
    UsersModule,
    NotificationsModule,
    ChatsModule,
    ProjectsModule,
  ],
  controllers: [InteractionsController],
  providers: [
    InteractionsService,
    { provide: InteractionsRepository, useClass: InteractionTypeormRepository },
  ],
})
export class InteractionsModule {}
