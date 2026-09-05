import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './infra/postgres/notification.entity';
import { NotificationTypeormRepository } from './infra/postgres/notification.typeorm.repository';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NotificationsRepository,
      useClass: NotificationTypeormRepository,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
