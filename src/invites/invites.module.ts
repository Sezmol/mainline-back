import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsModule } from '../chats/chats.module';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { InviteEntity } from './infra/postgres/invite.entity';
import { InviteTypeormRepository } from './infra/postgres/invite.typeorm.repository';
import { InviteTargetsController } from './invite-targets.controller';
import { InvitesController } from './invites.controller';
import { InvitesRepository } from './invites.repository';
import { InvitesService } from './invites.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteEntity]),
    CompaniesModule,
    ChatsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [InvitesController, InviteTargetsController],
  providers: [
    InvitesService,
    { provide: InvitesRepository, useClass: InviteTypeormRepository },
  ],
  exports: [InvitesService],
})
export class InvitesModule {}
