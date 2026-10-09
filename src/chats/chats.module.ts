import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AfterCommit } from '../infra/database/after-commit';
import { UsersModule } from '../users/users.module';
import { ChatEventsPublisher } from './chat-events.publisher';
import { ChatsController } from './chats.controller';
import { ChatsRepository } from './chats.repository';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './gateway/chats.gateway';
import { ChatParticipantEntity } from './infra/postgres/chat-participant.entity';
import { ChatEntity } from './infra/postgres/chat.entity';
import { ChatTypeormRepository } from './infra/postgres/chat.typeorm.repository';
import { MessageEntity } from './infra/postgres/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatEntity,
      ChatParticipantEntity,
      MessageEntity,
    ]),
    UsersModule,
    JwtModule.register({}),
  ],
  controllers: [ChatsController],
  providers: [
    AfterCommit,
    ChatsService,
    ChatsGateway,
    { provide: ChatsRepository, useClass: ChatTypeormRepository },
    { provide: ChatEventsPublisher, useExisting: ChatsGateway },
  ],
  exports: [ChatsService, ChatEventsPublisher],
})
export class ChatsModule {}
